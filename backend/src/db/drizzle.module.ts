import { Global, Module } from '@nestjs/common';
import { drizzleProvider } from './drizzle.provider';
import { DRIZZLE_DB } from './drizzle.types';

/** Disponibiliza o cliente Drizzle (token DRIZZLE_DB) globalmente para repositórios e serviços. */
@Global()
@Module({
  providers: [drizzleProvider],
  exports: [DRIZZLE_DB],
})
export class DrizzleModule {}
