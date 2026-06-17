# Arquitetura

## Visão geral

```
Cliente WhatsApp ─▶ Meta (real) / mock-meta ─(webhook assinado)─▶  API (NestJS, :8000)
                                                       │ middleware: marca início (timing p/ auditoria)
                                                       │ helmet (headers) + throttler (rate limit)
                                                       │ 1. valida assinatura (raw body)  [guard]
                                                       │ 2. persiste inbound (tx + idempotência)
                                                       │ 3. enfileira job (SQS)
                                                       │ 4. responde 200 rápido
                                                       ▼
                                              SQS: atendimento-jobs ──(falha xN)──▶ jobs-dlq
                                                       │
                                                       ▼
                                              Worker (NestJS context, sem HTTP)
                                                │ monta contexto (histórico + RAG)
                                                │ chama LLM (OpenAI real | simulado)  ← fallback
                                                │ persiste outbound
                                                ▼
                                MetaProvider (Graph API real | simulado) ─▶ WhatsApp do cliente
```

**Auditoria (transversal):** toda request é auditada exatamente uma vez, separada por status.
O `RequestTimingMiddleware` marca o início **antes dos guards**; o `AuditInterceptor` audita os
**sucessos** e o `AllExceptionsFilter` audita os **erros** (inclusive rejeições de guard 401/403)
com o status HTTP final correto. Ambos despacham um `AuditJob` para a fila `atendimento-audit`
(com `audit-dlq`); o worker persiste de forma durável. Se o enqueue falhar → **log estruturado**
(um coletor pode reprocessar) — de propósito NÃO inserimos direto no banco para não pressionar o
Postgres justamente quando o SQS está fora (evita falha em cascata). Nunca quebra a request.

## Dois processos, um código

- `src/main.ts` — **API HTTP** (`AppModule`): `rawBody: true`, `helmet()`, throttler, interceptor,
  filtro, middleware de timing e logger pino.
- `src/worker.ts` — **worker** (`WorkerModule`, contexto Nest sem HTTP) com 2 consumidores SQS
  (`jobs` + `audit`) e shutdown gracioso.

A mesma imagem Docker roda os dois (comandos diferentes). Ambos inicializam as filas via
`QueueBootstrap.ensureAll()` (idempotente, reaplica a redrive policy a cada start).

## Camadas e responsabilidades (SOLID)

| Pasta | Responsabilidade |
|-------|------------------|
| `config/` | Validação zod de TODO o `.env` + `AppConfigService` (getters tipados, resolução de modo híbrido, rate limit). Nenhum `process.env` espalhado. |
| `common/` | Transversais: assinatura HMAC, `withTransaction` (rollback), `AuditInterceptor` (sucesso), `AllExceptionsFilter` (erro), `RequestTimingMiddleware`, pipe zod, logger pino, `sleep`. |
| `db/` | Schema Drizzle (1 arquivo por tabela), provider/token do cliente, `migrate`, `seed`. |
| `queue/` | Cliente SQS, `QueueProducer`, `SqsConsumer` genérico (+ factory), `QueueBootstrap` (filas + DLQ + redrive idempotente). |
| `messaging/` | Repositórios (tenants, contacts, conversations, messages, processed) + idempotência + `ConversationService`. |
| `webhook/` | Handshake, guard de assinatura, parsing do payload, recebimento idempotente + enfileiramento. |
| `conversations-api/` | REST `GET /conversations[/:id/messages]` com guard de tenant. |
| `ai/` | Interface `LlmProvider`, impl OpenAI + simulada, factory, prompt builder, function calling (status de pedido). |
| `knowledge-base/` | Carga dos `*.md` + RAG (ranking por overlap de termos). |
| `meta/` | Interface `MetaProvider`, impl HTTP (Graph API) + simulada, factory. |
| `processing/` | `InboundProcessor` (núcleo do worker). |
| `audit/` | `AuditService` (fila → fallback de **log**, sem tocar o banco), `AuditProcessor` (persistência durável), `buildAuditJob`, `auditJobToRow`, repositório. |

## Reuso e DRY (destaques)

- `withTransaction(db, fn)` — único wrapper de transação/rollback, usado por webhook e auditoria.
- `SqsConsumer<T>` genérico — serve para jobs **e** auditoria; o worker só passa fila + handler.
- Repositórios aceitam um `DbExecutor` (db **ou** tx), reusados dentro/fora de transação.
- Factories de provider concentram a decisão real/simulado em **um único lugar** por integração.
- `buildAuditJob` — fonte única do registro de auditoria (interceptor de sucesso **e** filtro de erro).
- `auditJobToRow` — mapeamento usado pelo `AuditProcessor` (persistência durável no worker).

## Multi-tenant

- Webhook: tenant resolvido pelo `phone_number_id` do metadata (tabela `tenants`).
- REST: header `X-Tenant-Id` validado por `TenantGuard`; todos os repositórios filtram por `tenant_id`.

## Idempotência

- Tabela `processed_messages` com `UNIQUE(tenant_id, wam_id)`, reivindicada **dentro da transação**.
- Defesa extra: `UNIQUE(tenant_id, wa_message_id)` em `messages`.

## Resiliência

- **Retry/DLQ nativos do SQS**: em falha, a mensagem não é deletada → reentrega após o
  visibility timeout → DLQ após `SQS_MAX_RECEIVE_COUNT`. O `QueueBootstrap` (re)aplica a
  redrive policy de forma **idempotente** em todo start (mesmo com fila pré-existente).
- **Fallback de IA**: se a OpenAI falhar, o worker responde com mensagem de contingência.
- **Fallback de auditoria**: fila → **log estruturado** (não toca o banco sob falha do SQS,
  evitando carga síncrona no Postgres no pior momento). Nunca quebra a request.

## Segurança e limites (transversais)

- **Headers de segurança**: `helmet()` no bootstrap da API (CSP, HSTS, X-Frame-Options, etc.).
- **Rate limit**: `@nestjs/throttler` global (`THROTTLE_TTL`/`THROTTLE_LIMIT`), com
  `@SkipThrottle()` no webhook (rajadas da Meta) e no health (healthcheck do Docker).
- **Assinatura**: HMAC-SHA256 do corpo cru (`rawBody`) comparada em tempo constante.

## Modo híbrido (validado real e simulado)

`OPENAI_MODE` e `META_MODE` (`auto|real|simulated`) escolhem cada integração de forma
independente. Validado ao vivo: **OpenAI real** (RAG fiel + function calling) e **Meta real**
(Graph API entregando no WhatsApp), além do modo 100% simulado que sobe sem credenciais.
