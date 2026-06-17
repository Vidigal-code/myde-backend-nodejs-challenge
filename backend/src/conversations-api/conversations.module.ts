import { Module } from '@nestjs/common';
import { MessagingModule } from '@/messaging/messaging.module';
import { ConversationsController } from './conversations.controller';
import { TenantGuard } from './tenant.guard';

/** API REST de conversas/mensagens com isolamento multi-tenant. */
@Module({
  imports: [MessagingModule],
  controllers: [ConversationsController],
  providers: [TenantGuard],
})
export class ConversationsApiModule {}
