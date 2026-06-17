import { WebhookService } from '@/webhook/webhook.service';

/** Monta um WebhookService com dependências mockadas e um db cuja transação executa fn('tx'). */
function buildService(overrides: Record<string, any> = {}) {
  const deps = {
    db: { transaction: (fn: (tx: string) => unknown) => fn('tx') },
    tenants: { findByPhoneNumberId: jest.fn().mockResolvedValue({ id: 'tenant-1' }) },
    contacts: { ensure: jest.fn().mockResolvedValue({ id: 'contact-1' }) },
    conversations: {
      findOpenOrCreate: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      touch: jest.fn(),
    },
    messages: { insert: jest.fn().mockResolvedValue({ id: 'msg-1' }) },
    idempotency: { claim: jest.fn().mockResolvedValue(true) },
    producer: { enqueue: jest.fn().mockResolvedValue(undefined) },
    config: { queues: { jobs: 'jobs-url' } },
    ...overrides,
  };
  const service = new WebhookService(
    deps.db as any,
    deps.tenants as any,
    deps.contacts as any,
    deps.conversations as any,
    deps.messages as any,
    deps.idempotency as any,
    deps.producer as any,
    deps.config as any,
  );
  return { service, deps };
}

const payload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA',
      changes: [
        {
          field: 'messages',
          value: {
            metadata: { phone_number_id: '123' },
            contacts: [{ profile: { name: 'Cliente' }, wa_id: '5511999990000' }],
            messages: [
              { from: '5511999990000', id: 'wamid.ABC', timestamp: '1', type: 'text', text: { body: 'oi' } },
            ],
          },
        },
      ],
    },
  ],
};

describe('WebhookService.handleInbound', () => {
  it('persiste e enfileira na primeira vez', async () => {
    const { service, deps } = buildService();

    await service.handleInbound(payload);

    expect(deps.messages.insert).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'inbound', waMessageId: 'wamid.ABC', body: 'oi' }),
      'tx',
    );
    expect(deps.producer.enqueue).toHaveBeenCalledWith(
      'jobs-url',
      expect.objectContaining({ conversationId: 'conv-1', messageId: 'msg-1', to: '5511999990000' }),
    );
  });

  it('NÃO enfileira em reentrega (idempotência)', async () => {
    const { service, deps } = buildService({
      idempotency: { claim: jest.fn().mockResolvedValue(false) },
    });

    await service.handleInbound(payload);

    expect(deps.messages.insert).not.toHaveBeenCalled();
    expect(deps.producer.enqueue).not.toHaveBeenCalled();
  });

  it('ignora quando o tenant não é encontrado', async () => {
    const { service, deps } = buildService({
      tenants: { findByPhoneNumberId: jest.fn().mockResolvedValue(null) },
    });

    await service.handleInbound(payload);

    expect(deps.producer.enqueue).not.toHaveBeenCalled();
  });
});
