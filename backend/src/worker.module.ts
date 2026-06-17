import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './common/logger/logger.module';
import { DrizzleModule } from './db/drizzle.module';
import { QueueModule } from './queue/queue.module';
import { ProcessingModule } from './processing/processing.module';

/**
 * Módulo do worker (sem HTTP). Reúne os processadores (inbound + auditoria) e a
 * infraestrutura de fila/banco para consumir as filas SQS.
 */
@Module({
  imports: [AppConfigModule, LoggerModule, DrizzleModule, QueueModule, ProcessingModule],
})
export class WorkerModule {}
