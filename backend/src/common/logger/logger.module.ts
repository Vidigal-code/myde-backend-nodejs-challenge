import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { AppConfigService } from '@/config/app-config.service';

/** Logs estruturados (pino). Em produção, JSON puro; em dev, pino-pretty legível. */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          transport:
            process.env.NODE_ENV === 'production'
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
          redact: {
            paths: ['req.headers.authorization', 'req.headers["x-hub-signature-256"]'],
            remove: true,
          },
        },
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
