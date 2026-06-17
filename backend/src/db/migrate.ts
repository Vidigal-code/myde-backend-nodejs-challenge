import 'reflect-metadata';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';

/** Aplica as migrations geradas em ./drizzle. Reaproveita a configuração validada do app. */
async function run(): Promise<void> {
  const ctx = await NestFactory.createApplicationContext(AppConfigModule, {
    logger: ['error', 'warn'],
  });
  const config = ctx.get(AppConfigService);
  const sql = postgres(config.databaseUrl, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: join(__dirname, '..', '..', 'drizzle') });
    console.log('[migrate] migrations aplicadas com sucesso');
  } finally {
    await sql.end();
    await ctx.close();
  }
}

run().catch((err) => {
  console.error('[migrate] falhou:', err);
  process.exit(1);
});
