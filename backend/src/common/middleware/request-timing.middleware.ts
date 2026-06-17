import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuditableRequest } from '@/audit/audit-job.builder';

/**
 * Marca o início da request ANTES dos guards, para que a duração da auditoria seja
 * correta mesmo quando um guard rejeita (403/401) e o handler nunca executa.
 */
@Injectable()
export class RequestTimingMiddleware implements NestMiddleware {
  use(req: AuditableRequest, _res: Response, next: NextFunction): void {
    req.auditStartedAt = Date.now();
    next();
  }
}
