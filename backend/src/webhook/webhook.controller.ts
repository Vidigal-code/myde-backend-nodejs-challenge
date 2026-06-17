import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppConfigService } from '@/config/app-config.service';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import { WebhookService } from './webhook.service';

/** Endpoints do webhook da Meta: handshake (GET) e recebimento de mensagens (POST). */
@SkipThrottle()
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly config: AppConfigService,
    private readonly service: WebhookService,
  ) {}

  /** Handshake de verificação: ecoa hub.challenge quando o verify_token confere. */
  @Get()
  verify(@Query() query: Record<string, string>): string {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    if (mode === 'subscribe' && token === this.config.meta.verifyToken) {
      return challenge;
    }
    throw new ForbiddenException('verify_token inválido');
  }

  /** Recebimento: assinatura validada pelo guard; responde 200 rápido e processa em background. */
  @Post()
  @UseGuards(WebhookSignatureGuard)
  @HttpCode(200)
  async receive(@Body() body: unknown): Promise<{ received: true }> {
    await this.service.handleInbound(body);
    return { received: true };
  }
}
