import { Controller, Get, Param } from '@nestjs/common';
import { OrderStatusService, OrderStatus } from './order-status.service';

/** Endpoint mock interno consultado pela função get_order_status da IA. */
@Controller('internal/orders')
export class OrderStatusController {
  constructor(private readonly orders: OrderStatusService) {}

  @Get(':protocol')
  get(@Param('protocol') protocol: string): OrderStatus {
    return this.orders.find(protocol);
  }
}
