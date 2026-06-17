import { Conversation, Message } from '../db/schema';

/** Saída pública de uma conversa (esconde detalhes internos). */
export interface ConversationView {
  id: string;
  contactId: string;
  status: string;
  lastMessageAt: Date;
}

/** Saída pública de uma mensagem. */
export interface MessageView {
  id: string;
  direction: string;
  body: string;
  status: string;
  createdAt: Date;
}

export function toConversationView(c: Conversation): ConversationView {
  return { id: c.id, contactId: c.contactId, status: c.status, lastMessageAt: c.lastMessageAt };
}

export function toMessageView(m: Message): MessageView {
  return {
    id: m.id,
    direction: m.direction,
    body: m.body,
    status: m.status,
    createdAt: m.createdAt,
  };
}
