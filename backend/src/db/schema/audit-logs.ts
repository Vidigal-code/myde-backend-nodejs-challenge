import { pgTable, uuid, text, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

/** Resultado da request para fins de auditoria, separado por status (sucesso/erro). */
export const auditOutcomeEnum = pgEnum('audit_outcome', ['success', 'error']);

/** Trilha de auditoria de TODAS as requests HTTP, persistida de forma assíncrona via fila. */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id'),
  method: text('method').notNull(),
  path: text('path').notNull(),
  statusCode: integer('status_code').notNull(),
  outcome: auditOutcomeEnum('outcome').notNull(),
  durationMs: integer('duration_ms').notNull(),
  requestMeta: jsonb('request_meta'),
  error: jsonb('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
