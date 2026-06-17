import { SimulatedLlmProvider } from '@/ai/simulated-llm.provider';
import { OrderStatusClient } from '@/ai/order-status/order-status.client';
import { DONT_KNOW_REPLY } from '@/ai/prompt.builder';

describe('SimulatedLlmProvider (RAG fiel + function calling)', () => {
  const orderClient = { fetchStatus: jest.fn() } as unknown as OrderStatusClient;
  const provider = new SimulatedLlmProvider(orderClient);

  it('diz que não sabe quando não há contexto (não inventa)', async () => {
    const result = await provider.generate({
      systemPrompt: '',
      history: [],
      userMessage: 'qual a capital da França?',
      context: [],
    });
    expect(result.text).toBe(DONT_KNOW_REPLY);
  });

  it('responde a partir do contexto recuperado', async () => {
    const result = await provider.generate({
      systemPrompt: '',
      history: [],
      userMessage: 'quais os planos?',
      context: [{ source: 'kb.md', title: 'Planos', text: 'Fibra Start 300 Mbps R$ 79,90' }],
    });
    expect(result.text).toContain('Fibra Start 300 Mbps');
  });

  it('consulta status do pedido quando há protocolo PED-XXXX', async () => {
    (orderClient.fetchStatus as jest.Mock).mockResolvedValueOnce({
      protocol: 'PED-1001',
      status: 'em_instalacao',
      description: 'Técnico agendado.',
      updatedAt: '2026-06-17',
    });

    const result = await provider.generate({
      systemPrompt: '',
      history: [],
      userMessage: 'qual o status do PED-1001?',
      context: [],
    });

    expect(orderClient.fetchStatus).toHaveBeenCalledWith('PED-1001');
    expect(result.text).toContain('PED-1001');
  });
});
