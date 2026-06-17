import { Provider } from '@nestjs/common';
import { AppConfigService } from '@/config/app-config.service';
import { LLM_PROVIDER, LlmProvider } from './llm.types';
import { OpenAiLlmProvider } from './openai-llm.provider';
import { SimulatedLlmProvider } from './simulated-llm.provider';
import { OrderStatusClient } from './order-status/order-status.client';

/**
 * Único lugar onde se decide LLM real vs simulado. Instancia SOMENTE o provider
 * escolhido (o SDK da OpenAI lança erro se construído sem API key) — modo híbrido.
 */
export const llmProvider: Provider = {
  provide: LLM_PROVIDER,
  inject: [AppConfigService, OrderStatusClient],
  useFactory: (config: AppConfigService, orderClient: OrderStatusClient): LlmProvider =>
    config.isRealOpenAiEnabled()
      ? new OpenAiLlmProvider(config, orderClient)
      : new SimulatedLlmProvider(orderClient),
};
