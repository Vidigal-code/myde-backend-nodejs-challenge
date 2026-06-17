import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppConfigService } from '@/config/app-config.service';

/** Healthcheck simples + visibilidade do modo (real/simulado) de cada provedor. */
@SkipThrottle()
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
