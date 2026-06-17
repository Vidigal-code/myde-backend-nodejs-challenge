import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm.types';
import { llmProvider } from './llm.factory';
import { OrderStatusService } from './order-status/order-status.service';
import { OrderStatusClient } from './order-status/order-status.client';
import { OrderStatusController } from './order-status/order-status.controller';

/**
 * Camada de IA: provider de LLM (híbrido), cliente/serviço de status de pedido e o
 * endpoint mock consumido pela function calling. Exporta o token LLM_PROVIDER.
 */
@Module({
  controllers: [OrderStatusController],
  providers: [llmProvider, OrderStatusService, OrderStatusClient],
  exports: [LLM_PROVIDER, OrderStatusService, OrderStatusClient],
})
export class AiModule {}
