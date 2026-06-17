import { Provider } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { AppConfigService } from '../config/app-config.service';
import { schema } from './schema';
import { DRIZZLE_DB } from './drizzle.types';

/** Cria o cliente postgres-js a partir da URL. Pool pequeno: API e worker são processos enxutos. */
export function createDrizzleClient(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 10 });
  return drizzle(sql, { schema });
}

/** Provider do token DRIZZLE_DB, alimentado pelo AppConfigService. */
export const drizzleProvider: Provider = {
  provide: DRIZZLE_DB,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) => createDrizzleClient(config.databaseUrl),
};
