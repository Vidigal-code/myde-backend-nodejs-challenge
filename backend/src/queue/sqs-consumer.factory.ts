import { Inject, Injectable } from '@nestjs/common';
import { SQSClient } from '@aws-sdk/client-sqs';
import { AppConfigService } from '@/config/app-config.service';
import { SQS_CLIENT } from './sqs.client.provider';
import { JobHandler, SqsConsumer } from './sqs-consumer';

/**
 * Cria consumidores SQS já configurados com o cliente e o visibility timeout do app.
 * Centraliza a criação para que o worker apenas informe fila + handler.
 */
@Injectable()
export class SqsConsumerFactory {
  constructor(
    @Inject(SQS_CLIENT) private readonly sqs: SQSClient,
    private readonly config: AppConfigService,
  ) {}

  create<T>(name: string, queueUrl: string, handler: JobHandler<T>): SqsConsumer<T> {
    return new SqsConsumer<T>(this.sqs, {
      name,
      queueUrl,
      handler,
      visibilityTimeout: this.config.queues.visibilityTimeout,
    });
  }
}
