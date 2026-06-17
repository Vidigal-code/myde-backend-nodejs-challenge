import { llmProvider } from '@/ai/llm.factory';
import { OpenAiLlmProvider } from '@/ai/openai-llm.provider';
import { SimulatedLlmProvider } from '@/ai/simulated-llm.provider';
import { metaProvider } from '@/meta/meta.factory';
import { MetaHttpProvider } from '@/meta/meta-http.provider';
import { SimulatedMetaProvider } from '@/meta/simulated-meta.provider';
import { AppConfigService } from '@/config/app-config.service';
import { OrderStatusClient } from '@/ai/order-status/order-status.client';

const make = (provider: { useFactory: (...args: any[]) => unknown }, ...args: any[]) =>
  provider.useFactory(...args);

describe('Seleção híbrida independente de providers', () => {
  const orderClient = {} as OrderStatusClient;

  it('LLM: usa OpenAI quando habilitado', () => {
    const config = {
      isRealOpenAiEnabled: () => true,
      openAi: { apiKey: 'sk-test-123', model: 'gpt-4o-mini' },
    } as unknown as AppConfigService;
    expect(make(llmProvider as any, config, orderClient)).toBeInstanceOf(OpenAiLlmProvider);
  });

  it('LLM: usa simulado quando desabilitado', () => {
    const config = { isRealOpenAiEnabled: () => false } as unknown as AppConfigService;
    expect(make(llmProvider as any, config, orderClient)).toBeInstanceOf(SimulatedLlmProvider);
  });

  it('Meta: usa HTTP quando habilitado', () => {
    const config = {
      isRealMetaEnabled: () => true,
      meta: { baseUrl: 'http://x', token: 't', phoneNumberId: '1' },
    } as unknown as AppConfigService;
    expect(make(metaProvider as any, config)).toBeInstanceOf(MetaHttpProvider);
  });

  it('Meta: usa simulado quando desabilitado (ex.: OpenAI real + Meta off)', () => {
    const config = { isRealMetaEnabled: () => false } as unknown as AppConfigService;
    expect(make(metaProvider as any, config)).toBeInstanceOf(SimulatedMetaProvider);
  });
});
