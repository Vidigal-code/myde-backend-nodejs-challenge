import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConversationService } from '@/messaging/conversation.service';
import { RagService } from '@/knowledge-base/rag.service';
import { LLM_PROVIDER, LlmProvider, LlmResult } from '@/ai/llm.types';
import { buildSystemPrompt, FALLBACK_REPLY } from '@/ai/prompt.builder';
import { META_PROVIDER, MetaProvider } from '@/meta/meta.types';
import { ProcessInboundJob } from '@/queue/job.types';

/**
 * Núcleo do worker: para cada job de inbound, monta contexto (RAG + histórico),
 * gera a resposta (com FALLBACK se a IA falhar), envia via Meta e persiste a saída.
 *
 * Falha no ENVIO propaga exceção -> SQS reentrega -> DLQ (retry resiliente).
 * Falha na IA NÃO propaga -> usa resposta de fallback (não trava o atendimento).
 */
@Injectable()
export class InboundProcessor {
  private readonly logger = new Logger(InboundProcessor.name);

  constructor(
    private readonly conversation: ConversationService,
    private readonly rag: RagService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(META_PROVIDER) private readonly meta: MetaProvider,
  ) {}

  async process(job: ProcessInboundJob): Promise<void> {
    const turns = await this.conversation.buildHistory(job.tenantId, job.conversationId);
    const userMessage = turns.length > 0 ? turns[turns.length - 1].content : '';
    const history = turns.slice(0, -1);

    const reply = await this.generateReply(userMessage, history);
    const sent = await this.meta.sendText({
      phoneNumberId: job.phoneNumberId,
      to: job.to,
      text: reply.text,
    });

    await this.conversation.recordOutbound({
      tenantId: job.tenantId,
      conversationId: job.conversationId,
      body: reply.text,
      status: 'sent',
      waMessageId: sent.messageId,
    });
    this.logger.log(`resposta enviada (conversa=${job.conversationId}, fallback=${reply.usedFallback})`);
  }

  /** Gera a resposta com RAG + LLM; em falha da IA, retorna fallback seguro. */
  private async generateReply(
    userMessage: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<LlmResult> {
    const context = this.rag.retrieve(userMessage);
    const systemPrompt = buildSystemPrompt(context);
    try {
      return await this.llm.generate({ systemPrompt, history, userMessage, context });
    } catch (err) {
      this.logger.error(`IA falhou, usando fallback: ${String(err)}`);
      return { text: FALLBACK_REPLY, usedFallback: true };
    }
  }
}
