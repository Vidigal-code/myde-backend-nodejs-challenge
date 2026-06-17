import { Injectable } from '@nestjs/common';

export interface OrderStatus {
  protocol: string;
  status: string;
  description: string;
  updatedAt: string;
}

/**
 * Fonte mock de status de pedido (bônus de function calling). Determinístico a partir do
 * protocolo, sem banco — suficiente para demonstrar a ação real consultada pela IA.
 */
@Injectable()
export class OrderStatusService {
  private readonly catalog: Record<string, Omit<OrderStatus, 'protocol' | 'updatedAt'>> = {
    'PED-1001': { status: 'em_instalacao', description: 'Técnico agendado para amanhã das 9h às 12h.' },
    'PED-1002': { status: 'concluido', description: 'Instalação concluída e internet ativa.' },
    'PED-1003': { status: 'aguardando_pagamento', description: 'Aguardando confirmação do primeiro boleto.' },
  };

  find(protocol: string): OrderStatus {
    const key = protocol.trim().toUpperCase();
    const found = this.catalog[key];
    if (found) {
      return { protocol: key, updatedAt: '2026-06-17', ...found };
    }
    return {
      protocol: key,
      status: 'nao_encontrado',
      description: 'Nenhum pedido encontrado para este protocolo.',
      updatedAt: '2026-06-17',
    };
  }
}
