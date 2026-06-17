import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantsRepository } from '@/messaging/tenants.repository';

const TENANT_HEADER = 'x-tenant-id';

interface RequestWithTenant extends Request {
  tenantId?: string;
}

/** Exige um X-Tenant-Id válido (tenant existente) e o injeta na request para escopo dos dados. */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenants: TenantsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const header = request.headers[TENANT_HEADER];
    const tenantId = Array.isArray(header) ? header[0] : header;

    if (!tenantId) {
      throw new UnauthorizedException(`Header ${TENANT_HEADER} é obrigatório`);
    }
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Tenant inválido');
    }
    request.tenantId = tenant.id;
    return true;
  }
}
