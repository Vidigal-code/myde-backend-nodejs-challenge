import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from '@/audit/audit.service';
import { AuditJob } from '@/queue/job.types';

const TENANT_HEADER = 'x-tenant-id';

/** Request com possível tenant resolvido por um guard. */
interface RequestWithTenant extends Request {
  tenantId?: string;
}

/**
 * Audita TODAS as requests HTTP, separando por status (success/error). Despacha o
 * registro de forma assíncrona (fire-and-forget) e jamais interfere na resposta:
 * re-lança o erro original após registrar a auditoria.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithTenant>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.dispatch(request, response.statusCode, 'success', startedAt),
        error: (err) => this.dispatch(request, this.statusFromError(err), 'error', startedAt, err),
      }),
    );
  }

  private dispatch(
    request: RequestWithTenant,
    statusCode: number,
    outcome: 'success' | 'error',
    startedAt: number,
    error?: unknown,
  ): void {
    const job: AuditJob = {
      tenantId: this.resolveTenant(request),
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      outcome,
      durationMs: Date.now() - startedAt,
      requestMeta: { query: request.query, ip: request.ip },
      error: error ? this.serializeError(error) : undefined,
    };
    // fire-and-forget: a auditoria nunca bloqueia nem quebra a request.
    void this.audit.record(job);
  }

  private resolveTenant(request: RequestWithTenant): string | null {
    const header = request.headers[TENANT_HEADER];
    return request.tenantId ?? (typeof header === 'string' ? header : null);
  }

  private statusFromError(error: unknown): number {
    const status = (error as { status?: number; statusCode?: number })?.status;
    return status ?? (error as { statusCode?: number })?.statusCode ?? 500;
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return { name: error.name, message: error.message };
    }
    return { message: String(error) };
  }
}
