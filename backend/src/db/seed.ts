import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';
import { createDrizzleClient } from './drizzle.provider';
import { tenants } from './schema';

/**
 * Semeia o tenant default de forma idempotente (onConflictDoNothing pelo phone_number_id).
 * O webhook resolve o tenant por esse phone_number_id (vindo do metadata da Meta).
 */
async function run(): Promise<void> {
  const ctx = await NestFactory.createApplicationContext(AppConfigModule, {
    logger: ['error', 'warn'],
  });
  const config = ctx.get(AppConfigService);
  const db = createDrizzleClient(config.databaseUrl);

  await db
    .insert(tenants)
    .values({
      id: config.defaultTenant.id,
      name: config.defaultTenant.name,
      phoneNumberId: config.meta.phoneNumberId,
    })
    .onConflictDoNothing({ target: tenants.phoneNumberId });

  console.log(
    `[seed] tenant default garantido: ${config.defaultTenant.name} (phone_number_id=${config.meta.phoneNumberId})`,
  );
  await ctx.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] falhou:', err);
  process.exit(1);
});
