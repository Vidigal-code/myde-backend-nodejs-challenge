import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@/config/app-config.service';
import { OrderStatus } from './order-status.service';

/** Cliente HTTP para o endpoint mock de status de pedido (consumido pela function calling). */
@Injectable()
export class OrderStatusClient {
  constructor(private readonly config: AppConfigService) {}

  async fetchStatus(protocol: string): Promise<OrderStatus> {
    const url = `${this.config.orderStatusBaseUrl}/internal/orders/${encodeURIComponent(protocol)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`order-status respondeu HTTP ${res.status}`);
    }
    return (await res.json()) as OrderStatus;
  }
}
