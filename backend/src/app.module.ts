import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
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
import { RequestTimingMiddleware } from './common/middleware/request-timing.middleware';
import { HealthController } from './health/health.controller';

/**
 * Módulo da API HTTP. Registra globalmente: rate limit (ThrottlerGuard), interceptor de
 * auditoria (sucesso), filtro de exceções (erros auditados) e o middleware de timing.
 */
@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        { ttl: config.throttle.ttl, limit: config.throttle.limit },
      ],
    }),
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useExisting: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    AuditInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Captura o início de TODA request (antes dos guards) para a duração da auditoria.
    consumer.apply(RequestTimingMiddleware).forRoutes('*');
  }
}
