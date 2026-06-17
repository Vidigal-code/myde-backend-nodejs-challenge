import { Module } from '@nestjs/common';
import { MessagingModule } from '@/messaging/messaging.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

/** Webhook da Meta (handshake + recebimento idempotente + enfileiramento). */
@Module({
  imports: [MessagingModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
