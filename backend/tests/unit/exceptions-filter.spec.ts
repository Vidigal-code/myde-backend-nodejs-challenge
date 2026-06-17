import { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { NotFoundDomainError } from '@/common/errors/domain.errors';
import { AuditService } from '@/audit/audit.service';

function hostFor(request: Record<string, unknown>, captured: { res?: any }): ArgumentsHost {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  captured.res = res;
  return {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => res }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  const request = { method: 'GET', url: '/conversations/x/messages', headers: {}, query: {}, auditStartedAt: 0 };

  it('mapeia NotFoundDomainError para 404 e audita como error com o status correto', () => {
    const audit = { record: jest.fn() } as unknown as AuditService;
    const filter = new AllExceptionsFilter(audit);
    const captured: { res?: any } = {};

    filter.catch(new NotFoundDomainError('não encontrada'), hostFor(request, captured));

    expect(captured.res.status).toHaveBeenCalledWith(404);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'error', statusCode: 404 }),
    );
  });
});
