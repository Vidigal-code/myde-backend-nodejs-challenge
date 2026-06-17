import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * Registro de idempotência: a chave (tenant_id, wam_id) é reivindicada DENTRO da transação
 * de recebimento. Conflito de unicidade => mensagem já processada (reentrega da Meta).
 */
export const processedMessages = pgTable(
  'processed_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    wamId: text('wam_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqWamId: unique('processed_messages_tenant_wam_uq').on(t.tenantId, t.wamId),
  }),
);

export type ProcessedMessage = typeof processedMessages.$inferSelect;
export type NewProcessedMessage = typeof processedMessages.$inferInsert;
