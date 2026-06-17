import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE_DB, Database, DbExecutor } from '@/db/drizzle.types';
import { contacts, Contact } from '@/db/schema';

/** Acesso a contatos. Métodos aceitam um executor (db ou tx) para reuso em transações. */
@Injectable()
export class ContactsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /** Garante o contato (tenant, waId), criando se necessário, e retorna a linha. */
  async ensure(
    tenantId: string,
    waId: string,
    name: string | null,
    exec: DbExecutor = this.db,
  ): Promise<Contact> {
    const inserted = await exec
      .insert(contacts)
      .values({ tenantId, waId, name })
      .onConflictDoNothing({ target: [contacts.tenantId, contacts.waId] })
      .returning();
    if (inserted.length > 0) return inserted[0];

    const [existing] = await exec
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.waId, waId)));
    return existing;
  }
}
