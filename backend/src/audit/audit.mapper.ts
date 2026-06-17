import { AuditJob } from '@/queue/job.types';
import { NewAuditLog } from '@/db/schema';

/** Converte um AuditJob (fila) na linha a ser persistida (DRY entre fallback e processor). */
export function auditJobToRow(job: AuditJob): NewAuditLog {
  return {
    tenantId: job.tenantId,
    method: job.method,
    path: job.path,
    statusCode: job.statusCode,
    outcome: job.outcome,
    durationMs: job.durationMs,
    requestMeta: job.requestMeta ?? null,
    error: job.error ?? null,
  };
}
