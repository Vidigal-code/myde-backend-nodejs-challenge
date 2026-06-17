/** Barrel do schema: tudo que o Drizzle precisa conhecer (tabelas + enums + tipos). */
export * from './tenants';
export * from './contacts';
export * from './conversations';
export * from './messages';
export * from './audit-logs';
export * from './processed-messages';

import { tenants } from './tenants';
import { contacts } from './contacts';
import { conversations } from './conversations';
import { messages } from './messages';
import { auditLogs } from './audit-logs';
import { processedMessages } from './processed-messages';

/** Objeto de schema agregado, usado ao instanciar o cliente Drizzle. */
export const schema = {
  tenants,
  contacts,
  conversations,
  messages,
  auditLogs,
  processedMessages,
};
