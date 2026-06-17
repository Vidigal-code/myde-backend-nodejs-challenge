import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB, Database, DbExecutor } from '@/db/drizzle.types';
import { processedMessages } from '@/db/schema';

/** Controle de idempotência baseado na unicidade de (tenant_id, wam_id). */
@Injectable()
export class ProcessedMessagesRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /**
   * Tenta reivindicar o processamento de uma mensagem.
   * Retorna true se foi a PRIMEIRA vez (inseriu); false se já existia (reentrega).
   */
  async claim(tenantId: string, wamId: string, exec: DbExecutor = this.db): Promise<boolean> {
    const inserted = await exec
      .insert(processedMessages)
      .values({ tenantId, wamId })
      .onConflictDoNothing({ target: [processedMessages.tenantId, processedMessages.wamId] })
      .returning();
    return inserted.length > 0;
  }
}
