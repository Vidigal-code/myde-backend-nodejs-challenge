/** Contratos das mensagens que trafegam nas filas SQS. */

/** Job de processamento de uma mensagem inbound (gera resposta da IA e envia). */
export interface ProcessInboundJob {
  tenantId: string;
  conversationId: string;
  messageId: string;
  /** Destinatário da resposta (wa_id do contato). */
  to: string;
  /** phone_number_id de origem (Meta) usado no envio. */
  phoneNumberId: string;
}

/** Job de auditoria (persistência assíncrona do resultado de uma request). */
export interface AuditJob {
  tenantId: string | null;
  method: string;
  path: string;
  statusCode: number;
  outcome: 'success' | 'error';
  durationMs: number;
  requestMeta?: Record<string, unknown>;
  error?: Record<string, unknown>;
}
