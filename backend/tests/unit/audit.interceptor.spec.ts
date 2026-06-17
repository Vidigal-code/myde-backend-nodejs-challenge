import { firstValueFrom, of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { AuditService } from '@/audit/audit.service';

function contextFor(req: Record<string, unknown>, statusCode = 200): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('AuditInterceptor', () => {
  const baseReq = { method: 'GET', url: '/conversations', headers: {}, query: {}, ip: '127.0.0.1' };

  it('audita requests bem-sucedidas com outcome=success', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const interceptor = new AuditInterceptor(audit);
    const next: CallHandler = { handle: () => of('ok') };

    const result = await firstValueFrom(interceptor.intercept(contextFor(baseReq), next));

    expect(result).toBe('ok');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'success', statusCode: 200, method: 'GET' }),
    );
  });

  it('audita erros com outcome=error e re-lança o erro original', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const interceptor = new AuditInterceptor(audit);
    const boom = Object.assign(new Error('boom'), { status: 400 });
    const next: CallHandler = { handle: () => throwError(() => boom) };

    await expect(firstValueFrom(interceptor.intercept(contextFor(baseReq), next))).rejects.toThrow('boom');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'error', statusCode: 400 }),
    );
  });
});

describe('AuditService (fila -> fallback DB -> log)', () => {
  const job = {
    tenantId: 't1',
    method: 'GET',
    path: '/x',
    statusCode: 200,
    outcome: 'success' as const,
    durationMs: 5,
  };
  const config = { queues: { audit: 'audit-url' } } as any;
  // withTransaction(db, fn) chama db.transaction((tx) => fn(tx)); simulamos executando fn('tx').
  const db = { transaction: (fn: (tx: string) => unknown) => fn('tx') } as any;

  it('enfileira na fila de auditoria (caminho feliz, sem tocar o banco)', async () => {
    const producer = { enqueue: jest.fn().mockResolvedValue(undefined) } as any;
    const repo = { insert: jest.fn() } as any;
    const service = new AuditService(producer, config, repo, db);

    await service.record(job);

    expect(producer.enqueue).toHaveBeenCalledWith('audit-url', job);
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('cai para insert no banco quando o enqueue falha', async () => {
    const producer = { enqueue: jest.fn().mockRejectedValue(new Error('sqs down')) } as any;
    const repo = { insert: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AuditService(producer, config, repo, db);

    await service.record(job);

    expect(repo.insert).toHaveBeenCalledTimes(1);
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', outcome: 'success' }),
      'tx',
    );
  });
});
