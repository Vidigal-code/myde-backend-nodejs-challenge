import { Controller, Get } from '@nestjs/common';
import { AppConfigService } from '@/config/app-config.service';

/** Healthcheck simples + visibilidade do modo (real/simulado) de cada provedor. */
@Controller('health')
export class HealthController {
  constructor(private readonly config: AppConfigService) {}

  @Get()
  health(): {
    status: 'ok';
    providers: { openai: string; meta: string };
  } {
    return {
      status: 'ok',
      providers: { openai: this.config.openAiMode, meta: this.config.metaMode },
    };
  }
}
