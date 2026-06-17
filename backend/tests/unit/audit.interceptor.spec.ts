import { firstValueFrom, of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
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

  it('propaga o erro sem auditar (auditoria de erro fica no AllExceptionsFilter)', async () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const interceptor = new AuditInterceptor(audit);
    const boom = Object.assign(new Error('boom'), { status: 400 });
    const next: CallHandler = { handle: () => throwError(() => boom) };

    await expect(firstValueFrom(interceptor.intercept(contextFor(baseReq), next))).rejects.toThrow('boom');
    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe('AuditService (fila -> fallback de log, sem tocar o banco)', () => {
  const job = {
    tenantId: 't1',
    method: 'GET',
    path: '/x',
    statusCode: 200,
    outcome: 'success' as const,
    durationMs: 5,
  };
  const config = { queues: { audit: 'audit-url' } } as any;

  it('enfileira na fila de auditoria (caminho feliz)', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const producer = { enqueue: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AuditService(producer, config);

    await service.record(job);

    expect(producer.enqueue).toHaveBeenCalledWith('audit-url', job);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('cai para LOG quando o enqueue falha (não toca o banco, não lança)', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const producer = { enqueue: jest.fn().mockRejectedValue(new Error('sqs down')) } as any;
    const service = new AuditService(producer, config);

    await expect(service.record(job)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sqs down'));
    warnSpy.mockRestore();
  });
});
