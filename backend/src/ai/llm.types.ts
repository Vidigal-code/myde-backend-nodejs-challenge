/** Tipos compartilhados da camada de IA (sem dependência de provider específico). */
import { KbChunk } from '@/knowledge-base/kb.types';

/** Turno de conversa no formato neutro consumido pelos providers. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Entrada para geração:
 *  - systemPrompt: regras + contexto RAG já formatados;
 *  - history: turnos anteriores (sem a mensagem atual);
 *  - userMessage: a mensagem atual do cliente;
 *  - context: chunks recuperados (usado pelo provider simulado).
 */
export interface LlmRequest {
  systemPrompt: string;
  history: ChatTurn[];
  userMessage: string;
  context: KbChunk[];
}

/** Resultado da geração: texto e se a resposta veio do caminho de fallback. */
export interface LlmResult {
  text: string;
  usedFallback: boolean;
}

/** Token de injeção do provider de LLM (real ou simulado). */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

/** Contrato comum a OpenAI real e ao stub simulado. */
export interface LlmProvider {
  generate(request: LlmRequest): Promise<LlmResult>;
}
