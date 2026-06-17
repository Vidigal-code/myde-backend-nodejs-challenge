import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE_DB, Database, DbExecutor } from '@/db/drizzle.types';
import { messages, Message, NewMessage } from '@/db/schema';

/** Acesso a mensagens (inbound/outbound), sempre com escopo de tenant. */
@Injectable()
export class MessagesRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /** Insere uma mensagem e retorna a linha criada. */
  async insert(values: NewMessage, exec: DbExecutor = this.db): Promise<Message> {
    const [row] = await exec.insert(messages).values(values).returning();
    return row;
  }

  /** Lista mensagens de uma conversa em ordem cronológica (para histórico e API). */
  listByConversation(tenantId: string, conversationId: string): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.conversationId, conversationId)))
      .orderBy(asc(messages.createdAt));
  }
}
