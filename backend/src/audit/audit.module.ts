import { Module } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';
import { AuditProcessor } from './audit-processor.service';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

/**
 * Auditoria: repositório, serviço (fila→fallback→log), processor (consumidor durável)
 * e o interceptor global. O binding APP_INTERCEPTOR é feito no AppModule (contexto HTTP).
 */
@Module({
  providers: [AuditRepository, AuditService, AuditProcessor, AuditInterceptor],
  exports: [AuditRepository, AuditService, AuditProcessor, AuditInterceptor],
})
export class AuditModule {}
