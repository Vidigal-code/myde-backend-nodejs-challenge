import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/config/app-config.service';
import { QueueProducer } from '@/queue/queue-producer.service';
import { AuditJob } from '@/queue/job.types';
import { withTransaction } from '@/common/db/transaction.helper';
import { DRIZZLE_DB, Database } from '@/db/drizzle.types';
import { AuditRepository } from './audit.repository';
import { auditJobToRow } from './audit.mapper';

/**
 * Política de persistência da auditoria com cadeia de resiliência:
 *   1) enfileira na fila de auditoria (processada com retry/DLQ pelo worker);
 *   2) se o enqueue falhar -> insere direto no banco dentro de transação (rollback se falhar);
 *   3) se tudo falhar -> apenas loga. NUNCA propaga erro para a request original.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly producer: QueueProducer,
    private readonly config: AppConfigService,
    private readonly repository: AuditRepository,
    @Inject(DRIZZLE_DB) private readonly db: Database,
  ) {}

  async record(job: AuditJob): Promise<void> {
    try {
      await this.producer.enqueue(this.config.queues.audit, job);
      return;
    } catch (queueErr) {
      this.logger.warn(`enqueue de auditoria falhou, usando fallback no banco: ${String(queueErr)}`);
    }

    try {
      await withTransaction(this.db, (tx) => this.repository.insert(auditJobToRow(job), tx));
    } catch (dbErr) {
      this.logger.error(
        `fallback de auditoria no banco falhou (apenas log): ${String(dbErr)} :: ${JSON.stringify(job)}`,
      );
    }
  }
}
