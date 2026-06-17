import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/** Cliente (tenant) do sistema multi-tenant. Resolvido pelo phone_number_id da Meta. */
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  phoneNumberId: text('phone_number_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
