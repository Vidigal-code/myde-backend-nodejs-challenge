import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/** Contato (cliente final no WhatsApp), único por (tenant, wa_id). */
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    waId: text('wa_id').notNull(),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqWaId: unique('contacts_tenant_wa_id_uq').on(t.tenantId, t.waId),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
