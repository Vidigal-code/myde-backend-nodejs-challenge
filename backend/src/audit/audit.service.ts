import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { QueueProducer } from '../queue/queue-producer.service';
import { AuditJob } from '../queue/job.types';

/**
 * Despacho da auditoria com degradação graciosa, SEM tocar o banco no caminho da request:
 *   1) enfileira na fila de auditoria (caminho durável: worker persiste com retry/DLQ);
 *   2) se o enqueue falhar -> registra em LOG ESTRUTURADO (um coletor pode reprocessar).
 *
 * Por que não inserir direto no banco no fallback? Um insert síncrono no Postgres
 * justamente quando o SQS está fora adicionaria carga ao banco no pior momento (risco de
 * falha em cascata). O log não compete com a carga principal e NUNCA quebra a request.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly producer: QueueProducer,
    private readonly config: AppConfigService,
  ) {}

  async record(job: AuditJob): Promise<void> {
    try {
      await this.producer.enqueue(this.config.queues.audit, job);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `auditoria nao enfileirada; registrada em log para reprocessamento: ${JSON.stringify({ audit: job, reason })}`,
      );
    }
  }
}
