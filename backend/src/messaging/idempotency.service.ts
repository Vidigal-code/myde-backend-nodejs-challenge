import { Injectable } from '@nestjs/common';
import { DbExecutor } from '@/db/drizzle.types';
import { ProcessedMessagesRepository } from './processed-messages.repository';

/** Serviço de idempotência: thin layer sobre o repositório, com nome de domínio claro. */
@Injectable()
export class IdempotencyService {
  constructor(private readonly processed: ProcessedMessagesRepository) {}

  /** true = primeira vez (pode processar); false = já processado (ignorar). */
  claim(tenantId: string, wamId: string, exec?: DbExecutor): Promise<boolean> {
    return this.processed.claim(tenantId, wamId, exec);
  }
}
