import { Inject, Injectable, Logger } from '@nestjs/common';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { SQS_CLIENT } from './sqs.client.provider';

/** Publica mensagens (jobs) em qualquer fila SQS. Único ponto de envio (DRY). */
@Injectable()
export class QueueProducer {
  private readonly logger = new Logger(QueueProducer.name);

  constructor(@Inject(SQS_CLIENT) private readonly sqs: SQSClient) {}

  /** Serializa o corpo em JSON e envia para a fila informada. */
  async enqueue<T>(queueUrl: string, body: T): Promise<void> {
    await this.sqs.send(
      new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(body) }),
    );
    this.logger.debug(`mensagem enfileirada em ${queueUrl}`);
  }
}
