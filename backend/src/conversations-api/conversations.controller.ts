import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ConversationsRepository } from '@/messaging/conversations.repository';
import { MessagesRepository } from '@/messaging/messages.repository';
import { NotFoundDomainError } from '@/common/errors/domain.errors';
import { TenantGuard } from './tenant.guard';
import { TenantId } from './tenant.decorator';
import {
  ConversationView,
  MessageView,
  toConversationView,
  toMessageView,
} from './conversation.view';

/** API REST mínima, sempre escopada ao tenant autenticado (X-Tenant-Id). */
@Controller('conversations')
@UseGuards(TenantGuard)
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsRepository,
    private readonly messages: MessagesRepository,
  ) {}

  /** Lista as conversas do tenant. */
  @Get()
  async list(@TenantId() tenantId: string): Promise<ConversationView[]> {
    const rows = await this.conversations.listByTenant(tenantId);
    return rows.map(toConversationView);
  }

  /** Lista as mensagens de uma conversa do tenant (404 se não pertencer a ele). */
  @Get(':id/messages')
  async messagesOf(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<MessageView[]> {
    const conversation = await this.conversations.findByIdForTenant(tenantId, id);
    if (!conversation) {
      throw new NotFoundDomainError('Conversa não encontrada');
    }
    const rows = await this.messages.listByConversation(tenantId, id);
    return rows.map(toMessageView);
  }
}
