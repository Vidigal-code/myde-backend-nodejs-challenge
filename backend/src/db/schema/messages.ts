import { pgTable, uuid, text, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { conversations } from './conversations';

export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound']);
export const messageStatusEnum = pgEnum('message_status', ['received', 'sent', 'failed']);

/**
 * Mensagem (inbound ou outbound). wa_message_id único por tenant garante idempotência
 * de reentrega de webhooks (defesa em profundidade junto de processed_messages).
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    waMessageId: text('wa_message_id'),
    direction: messageDirectionEnum('direction').notNull(),
    type: text('type').default('text').notNull(),
    body: text('body').notNull(),
    status: messageStatusEnum('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqWaMessageId: unique('messages_tenant_wa_message_id_uq').on(t.tenantId, t.waMessageId),
  }),
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
