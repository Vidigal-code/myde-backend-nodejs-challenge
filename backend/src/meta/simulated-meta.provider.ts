import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MetaProvider, SendTextParams, SendTextResult } from './meta.types';

/**
 * Envio simulado (default sem Meta). Não chama a rede: apenas loga e devolve um id
 * sintético. Permite rodar "com OpenAI, sem Meta" sem nenhuma dependência externa.
 */
@Injectable()
export class SimulatedMetaProvider implements MetaProvider {
  private readonly logger = new Logger(SimulatedMetaProvider.name);

  async sendText(params: SendTextParams): Promise<SendTextResult> {
    const messageId = `wamid.sim-${randomUUID()}`;
    this.logger.log(
      `[SIMULADO] resposta para ${params.to} via ${params.phoneNumberId}: "${params.text}"`,
    );
    return { messageId };
  }
}
