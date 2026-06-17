import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** Injeta o tenantId resolvido pelo TenantGuard no parâmetro do handler. */
export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { tenantId?: string }>();
  return request.tenantId ?? '';
});
