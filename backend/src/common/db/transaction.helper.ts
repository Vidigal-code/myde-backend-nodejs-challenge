import { Database, DbExecutor } from '@/db/drizzle.types';

/**
 * Executa `fn` dentro de uma transação Drizzle. Qualquer exceção lançada em `fn`
 * dispara ROLLBACK automático; sucesso dispara COMMIT. Helper único e reutilizado
 * em todo o domínio (DRY) para garantir atomicidade.
 */
export function withTransaction<T>(
  db: Database,
  fn: (tx: DbExecutor) => Promise<T>,
): Promise<T> {
  return db.transaction((tx) => fn(tx));
}
