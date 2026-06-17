import { Module } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { ContactsRepository } from './contacts.repository';
import { ConversationsRepository } from './conversations.repository';
import { MessagesRepository } from './messages.repository';
import { ProcessedMessagesRepository } from './processed-messages.repository';
import { IdempotencyService } from './idempotency.service';
import { ConversationService } from './conversation.service';

/** Domínio de mensageria: repositórios + idempotência + serviço de conversa. */
@Module({
  providers: [
    TenantsRepository,
    ContactsRepository,
    ConversationsRepository,
    MessagesRepository,
    ProcessedMessagesRepository,
    IdempotencyService,
    ConversationService,
  ],
  exports: [
    TenantsRepository,
    ContactsRepository,
    ConversationsRepository,
    MessagesRepository,
    ProcessedMessagesRepository,
    IdempotencyService,
    ConversationService,
  ],
})
export class MessagingModule {}
