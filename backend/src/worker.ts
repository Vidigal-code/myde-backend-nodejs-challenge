import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';
import { AppConfigService } from './config/app-config.service';
import { SqsConsumerFactory } from './queue/sqs-consumer.factory';
import { QueueBootstrap } from './queue/queue-bootstrap.service';
import { InboundProcessor } from './processing/inbound-processor.service';
import { AuditProcessor } from './audit/audit-processor.service';
import { ProcessInboundJob, AuditJob } from './queue/job.types';

/**
 * Bootstrap do worker: cria um contexto Nest (sem HTTP) e inicia dois consumidores SQS
 * (jobs de inbound + auditoria). Encerramento gracioso em SIGTERM/SIGINT.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(AppConfigService);
  await app.get(QueueBootstrap).ensureAll();
  const factory = app.get(SqsConsumerFactory);
  const inbound = app.get(InboundProcessor);
  const audit = app.get(AuditProcessor);

  const consumers = [
    factory.create<ProcessInboundJob>('jobs', config.queues.jobs, (job) => inbound.process(job)),
    factory.create<AuditJob>('audit', config.queues.audit, (job) => audit.process(job)),
  ];
  consumers.forEach((c) => c.start());
  logger.log('Worker iniciado: consumindo filas jobs + audit', 'Bootstrap');

  const shutdown = async (): Promise<void> => {
    logger.log('Encerrando worker...', 'Bootstrap');
    consumers.forEach((c) => c.stop());
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar o worker:', err);
  process.exit(1);
});
