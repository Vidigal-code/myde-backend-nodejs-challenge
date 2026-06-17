import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { validateEnv } from './env.schema';

/**
 * Configuração global: carrega o .env, valida via zod (validateEnv) e expõe o
 * AppConfigService tipado para toda a aplicação (API e worker).
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // Fonte única de configuração na RAIZ do repositório (orquestra app + docker).
      // Em Docker as variáveis chegam por `environment`/`env_file` (process.env tem prioridade).
      envFilePath: ['../.env', '.env', '../.env.example', '.env.example'],
      validate: validateEnv,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
