import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { NotFoundDomainError } from '../errors/domain.errors';
import { AuditService } from '@/audit/audit.service';
import { AuditableRequest, buildAuditJob } from '@/audit/audit-job.builder';

/**
 * Converte qualquer exceção (de guard, pipe ou handler) em resposta JSON consistente,
 * audita o resultado como `error` com o status HTTP FINAL correto e loga falhas 5xx.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly audit: AuditService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<AuditableRequest>();
    const response = ctx.getResponse<Response>();
    const { status, message } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${status} ${message}`, exception instanceof Error ? exception.stack : undefined);
    }

    // Auditoria de TODA falha (inclui rejeições de guard), fire-and-forget.
    void this.audit.record(buildAuditJob(request, status, 'error', exception));

    response.status(status).json({
      statusCode: status,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      return { status: exception.getStatus(), message: exception.message };
    }
    if (exception instanceof NotFoundDomainError) {
      return { status: HttpStatus.NOT_FOUND, message: exception.message };
    }
    if (exception instanceof Error) {
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: exception.message };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erro interno' };
  }
}
