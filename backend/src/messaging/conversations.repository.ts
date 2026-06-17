import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB, Database, DbExecutor } from '@/db/drizzle.types';
import { conversations, Conversation } from '@/db/schema';

/** Acesso a conversas, sempre filtrando por tenant (isolamento multi-tenant). */
@Injectable()
export class ConversationsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /** Retorna a conversa aberta do contato ou cria uma nova. */
  async findOpenOrCreate(
    tenantId: string,
    contactId: string,
    exec: DbExecutor = this.db,
  ): Promise<Conversation> {
    const [open] = await exec
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.tenantId, tenantId),
          eq(conversations.contactId, contactId),
          eq(conversations.status, 'open'),
        ),
      )
      .limit(1);
    if (open) return open;

    const [created] = await exec
      .insert(conversations)
      .values({ tenantId, contactId })
      .returning();
    return created;
  }

  /** Atualiza o carimbo da última mensagem (ordenação da lista). */
  async touch(conversationId: string, exec: DbExecutor = this.db): Promise<void> {
    await exec
      .update(conversations)
      .set({ lastMessageAt: sql`now()` })
      .where(eq(conversations.id, conversationId));
  }

  /** Lista conversas do tenant, mais recentes primeiro. */
  listByTenant(tenantId: string): Promise<Conversation[]> {
    return this.db
      .select()
      .from(conversations)
      .where(eq(conversations.tenantId, tenantId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  /** Busca uma conversa garantindo que pertence ao tenant; null se não existir. */
  async findByIdForTenant(tenantId: string, id: string): Promise<Conversation | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, id)))
      .limit(1);
    return row ?? null;
  }
}
