# Decisões de arquitetura e trade-offs

## Principais escolhas

| Decisão | Por quê | Trade-off / o que ficou de fora |
|--------|---------|-------------------------------|
| **NestJS** | DI, módulos, interceptors/guards/filters resolvem os requisitos transversais (auditoria, tenant, assinatura) com fronteiras claras. | Mais boilerplate que um Express enxuto. |
| **Fila = SQS (LocalStack)** | Pedido do desafio; retry + DLQ nativos sem código de backoff. Redis permanece no compose, não usado. | Long-polling simples; sem FIFO/dedup nativa (idempotência é nossa). |
| **Drizzle + Postgres** | Tipagem forte do schema, migrations versionadas, transações com rollback explícito. | Sem repository genérico/ORM pesado (proposital, mais simples). |
| **Modo híbrido por provedor** | Rodar sem credenciais (simulado) **ou** com OpenAI real e/ou Meta real, de forma independente. | Dois caminhos de código por integração (cobertos por testes). |
| **RAG por overlap de termos** | Zero dependências, roda offline e é determinístico; suficiente para a base pequena. | Sem embeddings/pgvector (melhor recall ficaria para depois). |
| **`.env` central na raiz** | Orquestra docker-compose + API + worker a partir de uma fonte única. | Hosts de rede sobrescritos no compose (localhost ↔ nomes de serviço). |
| **Auto-criação de filas no bootstrap** | Idempotente, funciona em LocalStack e AWS, sem container de init frágil. | Pequena corrida API/worker (tratada com create idempotente). |
| **Auditoria via fila + fallback** | Não bloqueia a request; persistência durável com retry/DLQ. | Em colapso total (fila + banco) resta apenas o log. |

## Idempotência: commit-then-enqueue

Persistimos o inbound e **depois** enfileiramos (após o commit). É **at-least-once**: se o
processo cair entre o commit e o enqueue, o job pode não ser criado (mitigado por
reentrega do webhook pela Meta) — ou um job pode ser processado mais de uma vez. Para
exactly-once seria necessário um **outbox transacional**, deixado como evolução.

## Envio Meta vs persistência da resposta

O worker **envia** a resposta e só então persiste a outbound como `sent`. Se o envio falhar,
lança exceção → SQS reentrega (retry/DLQ). Em retry, a IA é chamada novamente (custo) — aceitável
no escopo; um cache de resposta por mensagem resolveria.

## Premissas

- O `phone_number_id` do mock mapeia para o tenant default semeado (`DEFAULT_TENANT_ID`).
- Autenticação multi-tenant via header `X-Tenant-Id` (simplificação): produção usaria API key/JWT.
- Apenas mensagens `type: text` são processadas (mídia/áudio fora do escopo).

## O que eu faria a seguir

- Outbox transacional para exactly-once.
- RAG com embeddings + pgvector.
- Auth real por tenant (API key/JWT) e rate limiting.
- Métricas (OpenTelemetry) além dos logs estruturados.
- Testes e2e subindo a stack (hoje cobrimos a lógica de negócio com unitários).
