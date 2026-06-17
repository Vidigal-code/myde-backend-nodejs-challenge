# Arquitetura

## Visão geral

```
Cliente WhatsApp ─▶ mock-meta ─(webhook assinado)─▶  API (NestJS, :8000)
                                                       │ 1. valida assinatura (raw body)
                                                       │ 2. persiste inbound (tx + idempotência)
                                                       │ 3. enfileira job (SQS)
                                                       │ 4. responde 200 rápido
                                                       ▼
                                              SQS: atendimento-jobs ──(falha xN)──▶ jobs-dlq
                                                       │
                                                       ▼
                                              Worker (NestJS context)
                                                │ monta contexto (histórico + RAG)
                                                │ chama LLM (OpenAI real | simulado)  ← fallback
                                                │ persiste outbound
                                                ▼
                                        Meta provider (HTTP real | simulado) ─▶ mock-meta ─▶ Cliente
```

Auditoria (transversal): um **interceptor global** registra TODAS as requests, separadas por
status, e despacha para a fila `atendimento-audit` (com `audit-dlq`). O worker persiste de
forma durável. Se a fila falhar, há **fallback** para insert direto; se o banco falhar, log.

## Dois processos, um código

- `src/main.ts` — **API HTTP** (`AppModule`).
- `src/worker.ts` — **worker** (`WorkerModule`, contexto Nest sem HTTP) com 2 consumidores SQS.

A mesma imagem Docker roda os dois (comandos diferentes). Ambos inicializam as filas via
`QueueBootstrap.ensureAll()` (idempotente).

## Camadas e responsabilidades (SOLID)

| Pasta | Responsabilidade |
|-------|------------------|
| `config/` | Validação zod de TODO o `.env` + `AppConfigService` (getters tipados, resolução de modo híbrido). Nenhum `process.env` espalhado. |
| `common/` | Utilidades puras e transversais: assinatura HMAC, `withTransaction` (rollback), interceptor de auditoria, filtro de exceções, pipe zod, logger pino, `sleep`. |
| `db/` | Schema Drizzle (1 arquivo por tabela), provider/token do cliente, `migrate`, `seed`. |
| `queue/` | Cliente SQS, `QueueProducer`, `SqsConsumer` genérico (+ factory), `QueueBootstrap` (filas+DLQ). |
| `messaging/` | Repositórios (tenants, contacts, conversations, messages, processed) + idempotência + `ConversationService`. |
| `webhook/` | Handshake, guard de assinatura, parsing do payload, recebimento idempotente + enfileiramento. |
| `conversations-api/` | REST `GET /conversations[/:id/messages]` com guard de tenant. |
| `ai/` | Interface `LlmProvider`, impl OpenAI + simulada, factory, prompt builder, function calling (status de pedido). |
| `knowledge-base/` | Carga dos `*.md` + RAG (ranking por overlap de termos). |
| `meta/` | Interface `MetaProvider`, impl HTTP + simulada, factory. |
| `processing/` | `InboundProcessor` (núcleo do worker) + `AuditProcessor`. |
| `audit/` | Repositório, serviço (fila→fallback→log), processor durável. |

## Reuso e DRY (destaques)

- `withTransaction(db, fn)` — único wrapper de transação/rollback, usado por webhook e auditoria.
- `SqsConsumer<T>` genérico — serve para jobs **e** auditoria; o worker só passa fila + handler.
- Repositórios aceitam um `DbExecutor` (db **ou** tx), reusados dentro/fora de transação.
- Factories de provider concentram a decisão real/simulado em **um único lugar** por integração.
- `auditJobToRow` — mapeamento único reaproveitado por fallback e processor.

## Multi-tenant

- Webhook: tenant resolvido pelo `phone_number_id` do metadata (tabela `tenants`).
- REST: header `X-Tenant-Id` validado por `TenantGuard`; todos os repositórios filtram por `tenant_id`.

## Idempotência

- Tabela `processed_messages` com `UNIQUE(tenant_id, wam_id)`, reivindicada **dentro da transação**.
- Defesa extra: `UNIQUE(tenant_id, wa_message_id)` em `messages`.

## Resiliência

- **Retry/DLQ nativos do SQS**: em falha, a mensagem não é deletada → reentrega após o
  visibility timeout → DLQ após `SQS_MAX_RECEIVE_COUNT`. O `QueueBootstrap` (re)aplica a
  redrive policy de forma idempotente em todo start (mesmo com fila pré-existente).
- **Fallback de IA**: se a OpenAI falhar, o worker responde com mensagem de contingência.
- **Fallback de auditoria**: fila → insert direto (tx) → log. Nunca quebra a request.

## Segurança e limites (transversais)

- **Headers de segurança**: `helmet()` no bootstrap da API (CSP, HSTS, X-Frame-Options, etc.).
- **Rate limit**: `@nestjs/throttler` global (`THROTTLE_TTL`/`THROTTLE_LIMIT`), com
  `@SkipThrottle()` no webhook (rajadas da Meta) e no health (healthcheck do Docker).
- **Auditoria de TUDO, separada por status**: o `RequestTimingMiddleware` marca o início
  antes dos guards; o `AuditInterceptor` audita os **sucessos** e o `AllExceptionsFilter`
  audita os **erros** (inclusive rejeições de guard 401/403) com o status HTTP final correto.
  Ambos usam o mesmo `buildAuditJob` (DRY) e o `AuditService` (fila → fallback → log).
