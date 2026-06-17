import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { schema } from './schema';

/** Token de injeção do cliente Drizzle. */
export const DRIZZLE_DB = Symbol('DRIZZLE_DB');

/** Tipo do banco com o schema agregado. */
export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Tipo de "executor" aceito pelos repositórios: tanto o banco quanto uma transação.
 * Permite reutilizar o MESMO repositório dentro ou fora de uma transação (DRY).
 */
export type DbExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];
