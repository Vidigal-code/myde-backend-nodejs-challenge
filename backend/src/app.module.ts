import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './common/logger/logger.module';
import { DrizzleModule } from './db/drizzle.module';
import { QueueModule } from './queue/queue.module';
import { MessagingModule } from './messaging/messaging.module';
import { AiModule } from './ai/ai.module';
import { WebhookModule } from './webhook/webhook.module';
import { ConversationsApiModule } from './conversations-api/conversations.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthController } from './health/health.controller';

/**
 * Módulo da API HTTP. Registra globalmente o interceptor de auditoria (de TODAS as
 * requests) e o filtro de exceções. AiModule entra pelo endpoint mock de status de pedido.
 */
@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DrizzleModule,
    QueueModule,
    MessagingModule,
    AiModule,
    WebhookModule,
    ConversationsApiModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useExisting: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    AuditInterceptor,
  ],
})
export class AppModule {}
