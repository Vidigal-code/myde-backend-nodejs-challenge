import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { AppConfigService } from '@/config/app-config.service';
import { verifySignature } from '@/common/crypto/signature.util';

const SIGNATURE_HEADER = 'x-hub-signature-256';

/** Rejeita o POST /webhook se a assinatura HMAC-SHA256 do corpo cru não bater. */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const header = request.headers[SIGNATURE_HEADER];
    const signature = Array.isArray(header) ? header[0] : header;
    const rawBody = request.rawBody;

    if (!rawBody || !verifySignature(rawBody, this.config.meta.appSecret, signature)) {
      throw new ForbiddenException('Assinatura X-Hub-Signature-256 inválida');
    }
    return true;
  }
}
