import { Logger } from '@nestjs/common';
import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { sleep } from '@/common/utils/sleep';

/** Função que processa o corpo (já desserializado) de um job. */
export type JobHandler<T> = (body: T) => Promise<void>;

export interface SqsConsumerOptions<T> {
  name: string;
  queueUrl: string;
  visibilityTimeout: number;
  handler: JobHandler<T>;
  waitTimeSeconds?: number;
  maxMessages?: number;
  errorBackoffMs?: number;
}

/**
 * Consumidor genérico de fila SQS (long-polling). Reutilizável para qualquer tipo de job.
 *
 * Política de retry/DLQ: em SUCESSO a mensagem é deletada; em ERRO ela NÃO é deletada,
 * então o SQS a reentrega após o visibility timeout e, ultrapassado o maxReceiveCount
 * (redrive policy configurada na fila), move automaticamente para a DLQ. Sem contadores
 * de retry na aplicação — usamos o mecanismo nativo do SQS.
 */
export class SqsConsumer<T> {
  private readonly logger: Logger;
  private running = false;

  constructor(
    private readonly sqs: SQSClient,
    private readonly options: SqsConsumerOptions<T>,
  ) {
    this.logger = new Logger(`SqsConsumer:${options.name}`);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.logger.log(`consumindo fila ${this.options.queueUrl}`);
    void this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const messages = await this.receive();
        for (const message of messages) {
          await this.handleMessage(message);
        }
      } catch (err) {
        this.logger.error(`erro no polling: ${this.describe(err)}`);
        await sleep(this.options.errorBackoffMs ?? 1000);
      }
    }
  }

  private async receive(): Promise<Message[]> {
    const result = await this.sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: this.options.queueUrl,
        MaxNumberOfMessages: this.options.maxMessages ?? 5,
        WaitTimeSeconds: this.options.waitTimeSeconds ?? 20,
        VisibilityTimeout: this.options.visibilityTimeout,
      }),
    );
    return result.Messages ?? [];
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      const body = JSON.parse(message.Body ?? '{}') as T;
      await this.options.handler(body);
      await this.deleteMessage(message);
    } catch (err) {
      // Não deleta: deixa o SQS reentregar e, no limite, mover para a DLQ.
      this.logger.error(`falha ao processar job (será reentregue): ${this.describe(err)}`);
    }
  }

  private async deleteMessage(message: Message): Promise<void> {
    await this.sqs.send(
      new DeleteMessageCommand({
        QueueUrl: this.options.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }

  private describe(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
