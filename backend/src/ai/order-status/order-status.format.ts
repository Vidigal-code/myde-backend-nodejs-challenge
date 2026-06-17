import { OrderStatus } from './order-status.service';

/** Mapeia códigos de status para texto amigável ao cliente. */
const STATUS_LABELS: Record<string, string> = {
  em_instalacao: 'em instalação',
  concluido: 'concluído',
  aguardando_pagamento: 'aguardando pagamento',
  nao_encontrado: 'não encontrado',
};

/** Formata o status do pedido como resposta legível (reutilizado por ambos os providers). */
export function formatOrderStatus(order: OrderStatus): string {
  const label = STATUS_LABELS[order.status] ?? order.status;
  if (order.status === 'nao_encontrado') {
    return `Não encontrei nenhum pedido com o protocolo ${order.protocol}. Confira o número e tente novamente.`;
  }
  return `O pedido ${order.protocol} está ${label}. ${order.description}`;
}
