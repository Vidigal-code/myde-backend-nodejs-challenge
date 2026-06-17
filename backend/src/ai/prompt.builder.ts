import { KbChunk } from '../knowledge-base/kb.types';

/** Mensagem de fallback quando a IA real falha (não trava o fluxo). */
export const FALLBACK_REPLY =
  'Desculpe, estou com uma instabilidade no atendimento automático neste momento. ' +
  'Já registrei sua mensagem e um de nossos atendentes vai te responder em breve.';

/** Resposta padrão quando a base de conhecimento não cobre a pergunta. */
export const DONT_KNOW_REPLY =
  'Não tenho essa informação na minha base de conhecimento. ' +
  'Posso te transferir para um atendente humano, se preferir.';

const SYSTEM_RULES = [
  'Você é o assistente virtual de atendimento de uma empresa de internet via fibra.',
  'Responda SEMPRE em português do Brasil, de forma cordial e objetiva.',
  'Use EXCLUSIVAMENTE as informações do CONTEXTO abaixo (base de conhecimento).',
  'Se a resposta não estiver no contexto, diga que não sabe e ofereça um atendente humano. NÃO invente.',
  'Para status de pedido (protocolos no formato PED-XXXX), use a ferramenta get_order_status quando disponível.',
].join('\n');

/** Formata os chunks recuperados como bloco de contexto rotulado por fonte. */
export function buildKbContext(chunks: KbChunk[]): string {
  if (chunks.length === 0) return '(nenhum trecho relevante encontrado)';
  return chunks
    .map((c) => `### Fonte: ${c.source} — ${c.title}\n${c.text}`)
    .join('\n\n');
}

/** Monta o prompt de sistema completo (regras + contexto RAG). */
export function buildSystemPrompt(chunks: KbChunk[]): string {
  return `${SYSTEM_RULES}\n\n=== CONTEXTO (base de conhecimento) ===\n${buildKbContext(chunks)}`;
}
