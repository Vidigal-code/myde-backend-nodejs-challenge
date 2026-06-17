import { Request } from 'express';
import { AuditJob } from '@/queue/job.types';

const TENANT_HEADER = 'x-tenant-id';

/** Request enriquecida com tenant (por guard) e início (por middleware de timing). */
export interface AuditableRequest extends Request {
  tenantId?: string;
  auditStartedAt?: number;
}

/**
 * Constrói o AuditJob a partir da request — fonte ÚNICA usada tanto pelo interceptor
 * (sucesso) quanto pelo filtro de exceções (erro), garantindo consistência (DRY).
 */
export function buildAuditJob(
  request: AuditableRequest,
  statusCode: number,
  outcome: 'success' | 'error',
  error?: unknown,
): AuditJob {
  const startedAt = request.auditStartedAt ?? Date.now();
  return {
    tenantId: resolveTenant(request),
    method: request.method,
    path: request.originalUrl ?? request.url,
    statusCode,
    outcome,
    durationMs: Math.max(0, Date.now() - startedAt),
    requestMeta: { query: request.query, ip: request.ip },
    error: error ? serializeError(error) : undefined,
  };
}

function resolveTenant(request: AuditableRequest): string | null {
  const header = request.headers[TENANT_HEADER];
  return request.tenantId ?? (typeof header === 'string' ? header : null);
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}
