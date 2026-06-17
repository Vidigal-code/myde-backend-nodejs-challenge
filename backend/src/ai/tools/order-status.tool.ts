import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { OrderStatusClient } from '../order-status/order-status.client';

/** Definição da função exposta à OpenAI (function calling). */
export const ORDER_STATUS_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_order_status',
    description:
      'Consulta o status de um pedido/instalação pelo protocolo no formato PED-XXXX.',
    parameters: {
      type: 'object',
      properties: {
        protocol: {
          type: 'string',
          description: 'Protocolo do pedido, ex.: PED-1001',
        },
      },
      required: ['protocol'],
    },
  },
};

/** Executa a tool: extrai o protocolo dos argumentos e consulta o cliente HTTP. */
export async function executeOrderStatusTool(
  rawArguments: string,
  client: OrderStatusClient,
): Promise<string> {
  const args = JSON.parse(rawArguments) as { protocol?: string };
  const protocol = args.protocol ?? '';
  const status = await client.fetchStatus(protocol);
  return JSON.stringify(status);
}
