import { Provider } from '@nestjs/common';
import { AppConfigService } from '@/config/app-config.service';
import { META_PROVIDER, MetaProvider } from './meta.types';
import { MetaHttpProvider } from './meta-http.provider';
import { SimulatedMetaProvider } from './simulated-meta.provider';

/**
 * Único lugar onde se decide envio Meta real (HTTP) vs simulado. Independente do LLM:
 * dá para rodar OpenAI real + Meta simulada (ou vice-versa).
 */
export const metaProvider: Provider = {
  provide: META_PROVIDER,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): MetaProvider =>
    config.isRealMetaEnabled()
      ? new MetaHttpProvider(config)
      : new SimulatedMetaProvider(),
};
