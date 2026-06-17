# Backend — Atendimento WhatsApp com IA (NestJS)

Solução do desafio: recebe webhooks da Meta (WhatsApp), valida assinatura, persiste,
processa **assíncrono** via **SQS** (retry + DLQ), gera resposta com **RAG + OpenAI** e
responde. Tudo em **NestJS + TypeScript + Drizzle ORM (Postgres)**, com **modo híbrido**
(real **ou** simulado, por provedor) e **interceptor de auditoria** de todas as requests.

> Documentação detalhada: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
> [`docs/DECISIONS.md`](docs/DECISIONS.md) · [`docs/RUNBOOK.md`](docs/RUNBOOK.md)

## TL;DR — subir tudo com Docker

```bash
# na RAIZ do repositório (onde fica o .env central)
docker compose up -d --build

# saúde
curl http://localhost:8000/health      # API (mostra modo openai/meta)
curl http://localhost:8001/health      # mock da Meta

# simular uma mensagem do cliente
curl -X POST http://localhost:8001/simulate/inbound \
  -H "Content-Type: application/json" \
  -d '{ "from": "5511999990000", "text": "Quais são os planos de vocês?" }'

# ver o que a "Meta" recebeu de volta
curl http://localhost:8001/sent
```

Sobe **100% simulado** (sem nenhuma credencial). A configuração central é o **`.env` na raiz**.

## Modo híbrido (independente por provedor)

Configure em `.env` (raiz). Cada integração é escolhida **separadamente**:

| Variável | Valores | Efeito |
|----------|---------|--------|
| `OPENAI_MODE` | `auto` \| `real` \| `simulated` | IA real (OpenAI) ou stub local |
| `META_MODE`   | `auto` \| `real` \| `simulated` | Envio real (HTTP) ou simulado |

`auto` usa real se houver credencial válida, senão cai para simulado. Combinações livres:
**OpenAI real + Meta simulada**, **OpenAI simulada + Meta real**, ambos ou nenhum.

Exemplo (rodar com OpenAI de verdade, sem Meta):

```dotenv
OPENAI_MODE=real
OPENAI_API_KEY=sk-proj-sua-chave-real
META_MODE=simulated
```

## Rodar localmente (sem Docker para a app)

```bash
# infra via docker
docker compose up -d postgres localstack mock-meta

cd backend
npm install
npm run db:migrate && npm run db:seed
npm run start:api      # porta 8000
npm run start:worker   # em outro terminal
```

## Testes

```bash
cd backend && npm test     # 30 testes unitários (tests/unit)
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | status + modo dos provedores |
| GET | `/webhook` | handshake da Meta (`hub.challenge`) |
| POST | `/webhook` | recebimento (valida `X-Hub-Signature-256`) |
| GET | `/conversations` | conversas do tenant (`X-Tenant-Id`) |
| GET | `/conversations/:id/messages` | mensagens da conversa |
| GET | `/internal/orders/:protocol` | mock de status de pedido (function calling) |
