import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/config/app-config.service';
import { withTransaction } from '@/common/db/transaction.helper';
import { DRIZZLE_DB, Database } from '@/db/drizzle.types';
import { TenantsRepository } from '@/messaging/tenants.repository';
import { ContactsRepository } from '@/messaging/contacts.repository';
import { ConversationsRepository } from '@/messaging/conversations.repository';
import { MessagesRepository } from '@/messaging/messages.repository';
import { IdempotencyService } from '@/messaging/idempotency.service';
import { QueueProducer } from '@/queue/queue-producer.service';
import { ProcessInboundJob } from '@/queue/job.types';
import { extractInboundMessages, metaWebhookSchema, NormalizedInbound } from './meta-payload';

/**
 * Recebe o webhook: valida o payload, persiste a mensagem inbound de forma idempotente
 * dentro de UMA transação (rollback em falha) e, após o commit, enfileira o job de
 * processamento. NÃO chama a OpenAI aqui (handler responde rápido).
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    private readonly tenants: TenantsRepository,
    private readonly contacts: ContactsRepository,
    private readonly conversations: ConversationsRepository,
    private readonly messages: MessagesRepository,
    private readonly idempotency: IdempotencyService,
    private readonly producer: QueueProducer,
    private readonly config: AppConfigService,
  ) {}

  async handleInbound(rawPayload: unknown): Promise<void> {
    const payload = metaWebhookSchema.parse(rawPayload);
    const inbound = extractInboundMessages(payload);
    for (const message of inbound) {
      await this.persistAndEnqueue(message);
    }
  }

  /** Persiste uma mensagem (transação) e enfileira o job somente se for nova. */
  private async persistAndEnqueue(inbound: NormalizedInbound): Promise<void> {
    const tenant = await this.tenants.findByPhoneNumberId(inbound.phoneNumberId);
    if (!tenant) {
      this.logger.warn(`tenant não encontrado para phone_number_id=${inbound.phoneNumberId}; ignorando`);
      return;
    }

    const job = await withTransaction(this.db, async (tx): Promise<ProcessInboundJob | null> => {
      const contact = await this.contacts.ensure(tenant.id, inbound.waId, inbound.contactName, tx);
      const conversation = await this.conversations.findOpenOrCreate(tenant.id, contact.id, tx);

      const isFirst = await this.idempotency.claim(tenant.id, inbound.messageId, tx);
      if (!isFirst) return null;

      const saved = await this.messages.insert(
        {
          tenantId: tenant.id,
          conversationId: conversation.id,
          waMessageId: inbound.messageId,
          direction: 'inbound',
          type: 'text',
          body: inbound.text,
          status: 'received',
        },
        tx,
      );
      await this.conversations.touch(conversation.id, tx);
      return {
        tenantId: tenant.id,
        conversationId: conversation.id,
        messageId: saved.id,
        to: inbound.waId,
        phoneNumberId: inbound.phoneNumberId,
      };
    });

    if (!job) {
      this.logger.log(`mensagem duplicada ignorada (idempotência): ${inbound.messageId}`);
      return;
    }

    await this.producer.enqueue(this.config.queues.jobs, job);
    this.logger.log(`inbound persistido e enfileirado: msg=${job.messageId}`);
  }
}
