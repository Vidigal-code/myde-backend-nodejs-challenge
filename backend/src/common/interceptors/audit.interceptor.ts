import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from '@/audit/audit.service';
import { AuditableRequest, buildAuditJob } from '@/audit/audit-job.builder';

/**
 * Audita as requests que CONCLUEM com sucesso (chegam ao handler). As que falham —
 * inclusive rejeições de guard (403/401) e erros de handler — são auditadas pelo
 * AllExceptionsFilter, com o status HTTP final correto. Assim, toda request é
 * auditada exatamente uma vez, separada por status. Fire-and-forget: nunca bloqueia.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuditableRequest>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap(() => void this.audit.record(buildAuditJob(request, response.statusCode, 'success'))),
    );
  }
}
