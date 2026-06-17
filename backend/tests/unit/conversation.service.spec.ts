import { ConversationService } from '@/messaging/conversation.service';
import { MessagesRepository } from '@/messaging/messages.repository';
import { ConversationsRepository } from '@/messaging/conversations.repository';

describe('ConversationService', () => {
  const messages = { listByConversation: jest.fn(), insert: jest.fn() } as unknown as MessagesRepository;
  const conversations = { touch: jest.fn() } as unknown as ConversationsRepository;
  const service = new ConversationService(messages, conversations);

  it('mapeia o histórico (inbound=user, outbound=assistant) em ordem', async () => {
    (messages.listByConversation as jest.Mock).mockResolvedValueOnce([
      { direction: 'inbound', body: 'oi' },
      { direction: 'outbound', body: 'olá, tudo bem?' },
    ]);

    const history = await service.buildHistory('t1', 'c1');

    expect(history).toEqual([
      { role: 'user', content: 'oi' },
      { role: 'assistant', content: 'olá, tudo bem?' },
    ]);
  });

  it('persiste a resposta como outbound e atualiza a conversa', async () => {
    (messages.insert as jest.Mock).mockResolvedValueOnce({ id: 'm1' });

    await service.recordOutbound({
      tenantId: 't1',
      conversationId: 'c1',
      body: 'resposta',
      status: 'sent',
      waMessageId: 'wamid.out',
    });

    expect(messages.insert).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'outbound', body: 'resposta', status: 'sent' }),
    );
    expect(conversations.touch).toHaveBeenCalledWith('c1');
  });
});
