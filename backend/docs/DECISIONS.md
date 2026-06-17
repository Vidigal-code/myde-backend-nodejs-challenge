# Decisões de arquitetura e trade-offs

## Principais escolhas

| Decisão | Por quê | Trade-off / o que ficou de fora |
|--------|---------|-------------------------------|
| **NestJS** | DI, módulos, interceptors/guards/filters/middleware resolvem os requisitos transversais (auditoria, tenant, assinatura, rate limit) com fronteiras claras. | Mais boilerplate que um Express enxuto. |
| **Fila = SQS (LocalStack)** | Pedido do desafio; retry + DLQ nativos sem código de backoff. Redis permanece no compose, não usado. | Long-polling simples; sem FIFO/dedup nativa (idempotência é nossa). |
| **Drizzle + Postgres** | Tipagem forte do schema, migrations versionadas, transações com rollback explícito. | Sem repository genérico/ORM pesado (proposital, mais simples). |
| **Modo híbrido por provedor** | Rodar sem credenciais (simulado) **ou** com OpenAI real e/ou Meta real, de forma independente. Validado ao vivo nos dois modos. | Dois caminhos de código por integração (cobertos por testes). |
| **RAG por overlap de termos** | Zero dependências, roda offline e é determinístico; suficiente para a base pequena. | Sem embeddings/pgvector (melhor recall ficaria para depois). |
| **`.env` central na raiz** | Orquestra docker-compose + API + worker a partir de uma fonte única. | Hosts de rede sobrescritos no compose (localhost ↔ nomes de serviço). |
| **Auto-criação de filas no bootstrap** | Idempotente (cria + `SetQueueAttributes` da redrive em todo start), funciona em LocalStack e AWS, sem container de init frágil. | Pequena corrida API/worker (tratada com create idempotente). |
| **Auditoria: interceptor (sucesso) + filtro (erro)** | Cobre **toda** request separada por status — inclusive rejeições de guard (401/403), que rodam antes do interceptor — com o status HTTP final correto. | Timing precisa de um middleware (roda antes dos guards). |
| **Auditoria via fila + fallback de log** | Não bloqueia a request; persistência durável (worker) com retry/DLQ. Se o SQS falhar, cai para **log estruturado** (não toca o banco). | Auditoria é best-effort em colapso total do SQS (recuperável via coletor de logs). |
| **helmet + @nestjs/throttler** | Headers de segurança e rate limit padrão, configuráveis por env, com baixo custo. | Throttler in-memory por instância (produção multi-nó usaria storage compartilhado, ex.: Redis). |

## Idempotência: commit-then-enqueue

Persistimos o inbound e **depois** enfileiramos (após o commit). É **at-least-once**: se o
processo cair entre o commit e o enqueue, o job pode não ser criado (mitigado por
reentrega do webhook pela Meta) — ou um job pode ser processado mais de uma vez. Para
exactly-once seria necessário um **outbox transacional**, deixado como evolução.

## Envio Meta vs persistência da resposta

O worker **envia** a resposta e só então persiste a outbound como `sent`. Se o envio falhar,
lança exceção → SQS reentrega (retry/DLQ). Em retry, a IA é chamada novamente (custo) — aceitável
no escopo; um cache de resposta por mensagem resolveria.

## Fallback de auditoria: log, não insert síncrono no banco

O `AuditService` enfileira o registro (caminho durável: worker persiste com retry/DLQ). Se o
**enqueue falhar**, em vez de inserir direto no Postgres, ele **registra em log estruturado**.

Motivo: um insert síncrono no banco *exatamente quando o SQS está fora* adicionaria carga
síncrona ao Postgres no pior momento (pressão no pool de conexões) — um fallback que pode
**amplificar** o incidente (falha em cascata). O log não compete com a carga principal, nunca
quebra a request e pode ser **reprocessado** por um coletor (Loki/ELK/CloudWatch). Para
auditoria de compliance com garantia de não-perda, o próximo passo seria um sink append-only
dedicado (ou outbox), não o banco transacional no caminho da request.

## Rate limit no webhook

O `POST /webhook` usa `@SkipThrottle()`: a Meta pode reentregar em rajada e a proteção real do
endpoint é a **validação de assinatura**, não o rate limit. O health também é isento (healthcheck
do Docker a cada 5s).

## Premissas

- O `phone_number_id` mapeia para o tenant semeado (`DEFAULT_TENANT_ID`). Para testar a Meta real,
  o tenant é apontado para o `phone_number_id` real do número de teste.
- Autenticação multi-tenant via header `X-Tenant-Id` (simplificação): produção usaria API key/JWT.
- Apenas mensagens `type: text` são processadas (mídia/áudio fora do escopo).

## O que eu faria a seguir

- Outbox transacional para exactly-once.
- RAG com embeddings + pgvector.
- Auth real por tenant (API key/JWT).
- Throttler com storage compartilhado (Redis) para rodar multi-instância.
- Métricas (OpenTelemetry) além dos logs estruturados.
- Testes e2e subindo a stack (hoje cobrimos a lógica de negócio com unitários).
