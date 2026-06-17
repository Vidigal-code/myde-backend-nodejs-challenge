import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './env.schema';
import {
  EffectiveMode,
  isMeaningfulSecret,
  resolveMode,
} from './provider-mode.util';

/**
 * Fachada tipada sobre o ConfigService. Todo acesso a configuração passa por aqui —
 * nenhum `process.env` espalhado pelo código. Getters pequenos e reutilizáveis.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  // ── App ──────────────────────────────────────────────
  get port(): number {
    return this.get('PORT');
  }

  get logLevel(): string {
    return this.get('LOG_LEVEL');
  }

  // ── Modos híbridos (resolução independente por provedor) ──
  get openAiMode(): EffectiveMode {
    return resolveMode(this.get('OPENAI_MODE'), isMeaningfulSecret(this.get('OPENAI_API_KEY')));
  }

  get metaMode(): EffectiveMode {
    return resolveMode(this.get('META_MODE'), isMeaningfulSecret(this.get('META_TOKEN')));
  }

  isRealOpenAiEnabled(): boolean {
    return this.openAiMode === 'real';
  }

  isRealMetaEnabled(): boolean {
    return this.metaMode === 'real';
  }

  // ── OpenAI ───────────────────────────────────────────
  get openAi(): { apiKey: string; model: string } {
    return { apiKey: this.get('OPENAI_API_KEY'), model: this.get('OPENAI_MODEL') };
  }

  // ── Meta ─────────────────────────────────────────────
  get meta(): {
    verifyToken: string;
    appSecret: string;
    token: string;
    baseUrl: string;
    phoneNumberId: string;
  } {
    return {
      verifyToken: this.get('META_VERIFY_TOKEN'),
      appSecret: this.get('META_APP_SECRET'),
      token: this.get('META_TOKEN'),
      baseUrl: this.get('META_API_BASE_URL'),
      phoneNumberId: this.get('META_PHONE_NUMBER_ID'),
    };
  }

  // ── Banco ────────────────────────────────────────────
  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  // ── SQS ──────────────────────────────────────────────
  get aws(): { region: string; endpoint: string; accessKeyId: string; secretAccessKey: string } {
    return {
      region: this.get('AWS_REGION'),
      endpoint: this.get('AWS_ENDPOINT_URL'),
      accessKeyId: this.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.get('AWS_SECRET_ACCESS_KEY'),
    };
  }

  get queues(): {
    jobs: string;
    jobsDlq: string;
    audit: string;
    auditDlq: string;
    maxReceiveCount: number;
    visibilityTimeout: number;
  } {
    return {
      jobs: this.get('SQS_JOBS_QUEUE_URL'),
      jobsDlq: this.get('SQS_JOBS_DLQ_URL'),
      audit: this.get('SQS_AUDIT_QUEUE_URL'),
      auditDlq: this.get('SQS_AUDIT_DLQ_URL'),
      maxReceiveCount: this.get('SQS_MAX_RECEIVE_COUNT'),
      visibilityTimeout: this.get('SQS_VISIBILITY_TIMEOUT'),
    };
  }

  // ── RAG / KB ─────────────────────────────────────────
  get knowledgeBaseDir(): string {
    return this.get('KNOWLEDGE_BASE_DIR');
  }

  // ── Multi-tenant ─────────────────────────────────────
  get defaultTenant(): { id: string; name: string } {
    return { id: this.get('DEFAULT_TENANT_ID'), name: this.get('DEFAULT_TENANT_NAME') };
  }

  // ── Function calling ─────────────────────────────────
  /** Base do endpoint de status de pedido; vazio = usa a própria API (localhost:PORT). */
  get orderStatusBaseUrl(): string {
    const configured = this.get('ORDER_STATUS_BASE_URL');
    return configured && configured.trim().length > 0
      ? configured
      : `http://localhost:${this.port}`;
  }
}
