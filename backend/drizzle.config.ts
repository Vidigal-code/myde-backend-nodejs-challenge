import type { Config } from 'drizzle-kit';

/**
 * Configuração do Drizzle Kit (geração e aplicação de migrations).
 * A URL vem do ambiente; o fallback aponta para o Postgres local do docker-compose.
 */
export default {
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/atendimento',
  },
} satisfies Config;
