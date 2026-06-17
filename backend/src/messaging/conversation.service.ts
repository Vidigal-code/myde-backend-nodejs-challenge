import { Injectable } from '@nestjs/common';
import { Message } from '@/db/schema';
import { ChatTurn } from '@/ai/llm.types';
import { MessagesRepository } from './messages.repository';
import { ConversationsRepository } from './conversations.repository';

/** Status possíveis ao registrar uma mensagem de saída. */
type OutboundStatus = 'sent' | 'failed';

/** Orquestra leitura de histórico e gravação de mensagens de uma conversa. */
@Injectable()
export class ConversationService {
  constructor(
    private readonly messages: MessagesRepository,
    private readonly conversations: ConversationsRepository,
  ) {}

  /** Monta o histórico no formato neutro de chat (inbound=user, outbound=assistant). */
  async buildHistory(tenantId: string, conversationId: string): Promise<ChatTurn[]> {
    const rows = await this.messages.listByConversation(tenantId, conversationId);
    return rows.map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body,
    }));
  }

  /** Persiste a resposta gerada (outbound) e atualiza o carimbo da conversa. */
  async recordOutbound(params: {
    tenantId: string;
    conversationId: string;
    body: string;
    status: OutboundStatus;
    waMessageId?: string | null;
  }): Promise<Message> {
    const message = await this.messages.insert({
      tenantId: params.tenantId,
      conversationId: params.conversationId,
      direction: 'outbound',
      type: 'text',
      body: params.body,
      status: params.status,
      waMessageId: params.waMessageId ?? null,
    });
    await this.conversations.touch(params.conversationId);
    return message;
  }
}
