import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/config/app-config.service';
import { MetaProvider, SendTextParams, SendTextResult } from './meta.types';

/**
 * Envio real via Meta Cloud API (ou o mock, que fala o mesmo formato):
 *   POST {baseUrl}/{phoneNumberId}/messages  com  Authorization: Bearer {token}
 */
@Injectable()
export class MetaHttpProvider implements MetaProvider {
  private readonly logger = new Logger(MetaHttpProvider.name);

  constructor(private readonly config: AppConfigService) {}

  async sendText(params: SendTextParams): Promise<SendTextResult> {
    const { baseUrl, token } = this.config.meta;
    const url = `${baseUrl}/${params.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'text',
        text: { body: params.text },
      }),
    });

    if (!res.ok) {
      throw new Error(`Meta API respondeu HTTP ${res.status}`);
    }

    const data = (await res.json()) as { messages?: Array<{ id?: string }> };
    const messageId = data.messages?.[0]?.id ?? '';
    this.logger.debug(`mensagem enviada via Meta (id=${messageId})`);
    return { messageId };
  }
}
