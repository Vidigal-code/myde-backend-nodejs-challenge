import { Global, Module } from '@nestjs/common';
import { sqsClientProvider, SQS_CLIENT } from './sqs.client.provider';
import { QueueProducer } from './queue-producer.service';
import { SqsConsumerFactory } from './sqs-consumer.factory';
import { QueueBootstrap } from './queue-bootstrap.service';

/**
 * Camada de fila (SQS). Exporta o producer (usado pela API e auditoria) e a factory de
 * consumidores (usada pelo worker). Global para reuso simples em todos os módulos.
 */
@Global()
@Module({
  providers: [sqsClientProvider, QueueProducer, SqsConsumerFactory, QueueBootstrap],
  exports: [SQS_CLIENT, QueueProducer, SqsConsumerFactory, QueueBootstrap],
})
export class QueueModule {}
