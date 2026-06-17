import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider, LlmRequest, LlmResult } from './llm.types';
import { DONT_KNOW_REPLY } from './prompt.builder';
import { OrderStatusClient } from './order-status/order-status.client';
import { extractProtocol } from './order-status/protocol.util';
import { formatOrderStatus } from './order-status/order-status.format';

/**
 * Provider simulado (default sem credenciais). Determinístico, sem rede externa:
 *  - detecta protocolo PED-XXXX e consulta o status (mesma "função" da IA real);
 *  - senão, responde com o trecho mais relevante do contexto RAG;
 *  - se não houver contexto, diz que não sabe (não inventa).
 */
@Injectable()
export class SimulatedLlmProvider implements LlmProvider {
  private readonly logger = new Logger(SimulatedLlmProvider.name);

  constructor(private readonly orderClient: OrderStatusClient) {}

  async generate(request: LlmRequest): Promise<LlmResult> {
    this.logger.debug('gerando resposta no modo simulado');

    const protocol = extractProtocol(request.userMessage);
    if (protocol) {
      const status = await this.orderClient.fetchStatus(protocol);
      return { text: formatOrderStatus(status), usedFallback: false };
    }

    if (request.context.length === 0) {
      return { text: DONT_KNOW_REPLY, usedFallback: false };
    }

    const top = request.context[0];
    const text = `Com base nas nossas informações sobre "${top.title}":\n\n${top.text}`;
    return { text, usedFallback: false };
  }
}
