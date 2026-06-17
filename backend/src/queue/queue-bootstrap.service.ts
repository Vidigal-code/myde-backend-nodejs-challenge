import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { AppConfigService } from '@/config/app-config.service';
import { SQS_CLIENT } from './sqs.client.provider';

/** Extrai o nome da fila a partir da URL configurada (último segmento do path). */
export function queueNameFromUrl(url: string): string {
  const segments = url.split('/').filter((s) => s.length > 0);
  return segments[segments.length - 1];
}

/**
 * Garante a existência das filas e suas DLQs com redrive policy (maxReceiveCount).
 * Idempotente e reutilizável tanto no LocalStack quanto na AWS real — evita um
 * container de init separado. Chamado no bootstrap da API e do worker.
 */
@Injectable()
export class QueueBootstrap {
  private readonly logger = new Logger(QueueBootstrap.name);

  constructor(
    @Inject(SQS_CLIENT) private readonly sqs: SQSClient,
    private readonly config: AppConfigService,
  ) {}

  async ensureAll(): Promise<void> {
    const q = this.config.queues;
    await this.ensurePair(q.jobs, q.jobsDlq, q.maxReceiveCount);
    await this.ensurePair(q.audit, q.auditDlq, q.maxReceiveCount);
    this.logger.log('filas SQS (jobs/audit) e DLQs garantidas');
  }

  /** Cria a DLQ, depois a fila principal apontando para ela via redrive policy. */
  private async ensurePair(mainUrl: string, dlqUrl: string, maxReceiveCount: number): Promise<void> {
    const dlqArn = await this.ensureQueueArn(dlqUrl);
    await this.ensureQueue(mainUrl, {
      RedrivePolicy: JSON.stringify({ deadLetterTargetArn: dlqArn, maxReceiveCount }),
    });
  }

  /** Cria a fila (ignora se já existir) e retorna seu ARN. */
  private async ensureQueueArn(url: string): Promise<string> {
    await this.ensureQueue(url, {});
    const attrs = await this.sqs.send(
      new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['QueueArn'] }),
    );
    return attrs.Attributes?.QueueArn ?? '';
  }

  /**
   * Garante a fila de forma idempotente: cria se não existir e SEMPRE (re)aplica os
   * atributos desejados (ex.: redrive policy) — mesmo se a fila já existia. Evita o bug
   * de uma fila pré-existente ficar sem a política de DLQ/retry.
   */
  private async ensureQueue(url: string, attributes: Record<string, string>): Promise<void> {
    const name = queueNameFromUrl(url);
    try {
      await this.sqs.send(new CreateQueueCommand({ QueueName: name }));
    } catch (err) {
      this.logger.debug(`fila ${name} já existia: ${String(err)}`);
    }
    if (Object.keys(attributes).length > 0) {
      await this.sqs.send(new SetQueueAttributesCommand({ QueueUrl: url, Attributes: attributes }));
    }
  }
}
