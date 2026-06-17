import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditJob } from '@/queue/job.types';
import { withTransaction } from '@/common/db/transaction.helper';
import { DRIZZLE_DB, Database } from '@/db/drizzle.types';
import { AuditRepository } from './audit.repository';
import { auditJobToRow } from './audit.mapper';

/**
 * Consome a fila de auditoria e persiste de forma durável dentro de transação
 * (rollback em falha). Se lançar, o SQS reentrega e, no limite, envia para a audit-dlq.
 */
@Injectable()
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(
    private readonly repository: AuditRepository,
    @Inject(DRIZZLE_DB) private readonly db: Database,
  ) {}

  async process(job: AuditJob): Promise<void> {
    await withTransaction(this.db, (tx) => this.repository.insert(auditJobToRow(job), tx));
    this.logger.debug(`auditoria persistida: ${job.method} ${job.path} -> ${job.outcome}`);
  }
}
