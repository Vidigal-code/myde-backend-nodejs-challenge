import { IdempotencyService } from '@/messaging/idempotency.service';
import { ProcessedMessagesRepository } from '@/messaging/processed-messages.repository';

describe('IdempotencyService', () => {
  const repo = { claim: jest.fn() } as unknown as ProcessedMessagesRepository;
  const service = new IdempotencyService(repo);

  it('retorna true na primeira vez (mensagem nova)', async () => {
    (repo.claim as jest.Mock).mockResolvedValueOnce(true);
    await expect(service.claim('t1', 'wamid.1')).resolves.toBe(true);
  });

  it('retorna false em reentrega (mensagem duplicada)', async () => {
    (repo.claim as jest.Mock).mockResolvedValueOnce(false);
    await expect(service.claim('t1', 'wamid.1')).resolves.toBe(false);
  });
});
