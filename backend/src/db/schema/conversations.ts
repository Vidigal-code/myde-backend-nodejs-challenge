import { pgTable, uuid, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { contacts } from './contacts';

export const conversationStatusEnum = pgEnum('conversation_status', ['open', 'closed']);

/** Conversa (thread) entre um contato e o tenant. */
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contacts.id),
  status: conversationStatusEnum('status').default('open').notNull(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
