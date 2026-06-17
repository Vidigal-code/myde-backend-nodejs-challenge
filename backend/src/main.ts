import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true });
  app.useLogger(app.get(Logger));
  // Políticas de cabeçalho de segurança (CSP, X-Frame-Options, HSTS, etc.).
  app.use(helmet());
  app.enableShutdownHooks();

  const config = app.get(AppConfigService);
  await app.listen(config.port);
  app.get(Logger).log(
    `API ouvindo na porta ${config.port} (OpenAI=${config.openAiMode}, Meta=${config.metaMode})`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar a API:', err);
  process.exit(1);
});
