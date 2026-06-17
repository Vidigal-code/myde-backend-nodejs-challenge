import { z } from 'zod';

/** Schema (tolerante) do webhook de mensagens da Meta — apenas o que consumimos. */
const messageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string().optional(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
});

const valueSchema = z.object({
  metadata: z.object({ phone_number_id: z.string() }),
  contacts: z
    .array(z.object({ profile: z.object({ name: z.string() }).optional(), wa_id: z.string() }))
    .optional(),
  messages: z.array(messageSchema).optional(),
});

const changeSchema = z.object({ field: z.string(), value: valueSchema });
const entrySchema = z.object({ id: z.string().optional(), changes: z.array(changeSchema) });

export const metaWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(entrySchema),
});

export type MetaWebhookPayload = z.infer<typeof metaWebhookSchema>;

/** Mensagem inbound normalizada, pronta para persistência. */
export interface NormalizedInbound {
  phoneNumberId: string;
  waId: string;
  contactName: string | null;
  messageId: string;
  text: string;
}

/** Extrai e normaliza apenas as mensagens de texto do payload (achata a estrutura aninhada). */
export function extractInboundMessages(payload: MetaWebhookPayload): NormalizedInbound[] {
  const result: NormalizedInbound[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const { metadata, contacts, messages } = change.value;
      for (const message of messages ?? []) {
        if (message.type !== 'text' || !message.text) continue;
        result.push({
          phoneNumberId: metadata.phone_number_id,
          waId: message.from,
          contactName: resolveContactName(contacts, message.from),
          messageId: message.id,
          text: message.text.body,
        });
      }
    }
  }
  return result;
}

function resolveContactName(
  contacts: MetaWebhookPayload['entry'][number]['changes'][number]['value']['contacts'],
  waId: string,
): string | null {
  const match = contacts?.find((c) => c.wa_id === waId) ?? contacts?.[0];
  return match?.profile?.name ?? null;
}
