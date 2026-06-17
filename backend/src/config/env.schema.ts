import { z } from 'zod';

/**
 * Modo de cada provedor externo. A seleção real/simulado é INDEPENDENTE por integração,
 * permitindo combinações como "OpenAI real + Meta simulada".
 */
export const providerModeSchema = z
  .enum(['auto', 'real', 'simulated'])
  .default('auto');

/** Schema único e centralizado de TODAS as variáveis de ambiente (sem process.env espalhado). */
export const envSchema = z.object({
  // App
  PORT: z.coerce.number().int().positive().default(8000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  // Modos híbridos
  OPENAI_MODE: providerModeSchema,
  META_MODE: providerModeSchema,

  // OpenAI
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // Meta
  META_VERIFY_TOKEN: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_TOKEN: z.string().default(''),
  META_API_BASE_URL: z.string().url().default('http://localhost:8001'),
  META_PHONE_NUMBER_ID: z.string().min(1),

  // Banco
  DATABASE_URL: z.string().min(1),

  // Fila (SQS / LocalStack)
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ENDPOINT_URL: z.string().url().default('http://localhost:4566'),
  AWS_ACCESS_KEY_ID: z.string().default('test'),
  AWS_SECRET_ACCESS_KEY: z.string().default('test'),
  SQS_JOBS_QUEUE_URL: z.string().url(),
  SQS_JOBS_DLQ_URL: z.string().url(),
  SQS_AUDIT_QUEUE_URL: z.string().url(),
  SQS_AUDIT_DLQ_URL: z.string().url(),
  SQS_MAX_RECEIVE_COUNT: z.coerce.number().int().positive().default(3),
  SQS_VISIBILITY_TIMEOUT: z.coerce.number().int().positive().default(30),

  // RAG
  KNOWLEDGE_BASE_DIR: z.string().default('../knowledge-base'),

  // Multi-tenant
  DEFAULT_TENANT_ID: z.string().uuid(),
  DEFAULT_TENANT_NAME: z.string().default('Tenant Default'),

  // Function calling
  ORDER_STATUS_BASE_URL: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

/** Valida e normaliza o ambiente; lança erro legível se algo obrigatório faltar. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  return parsed.data;
}
