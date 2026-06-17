# Runbook — operar e testar

> **Porta do host:** o `docker-compose` publica a API em `${API_HOST_PORT:-8000}`. Se a 8000
> estiver ocupada na sua máquina, suba com `API_HOST_PORT=8080 docker compose up -d` (a porta
> interna e a rede Docker continuam em 8000). Os exemplos abaixo usam `8000`.

## Subir tudo (Docker)

```bash
docker compose up -d --build
docker compose ps           # postgres, localstack, mock-meta, api, worker
docker compose logs -f api worker
```

A `api` roda migrations + seed automaticamente antes de iniciar. Sobe **100% simulado** sem
credenciais; para usar real, ajuste `OPENAI_MODE`/`META_MODE` no `.env` (ver seção "Modo real").

## Verificações rápidas

```bash
curl http://localhost:8000/health     # {"status":"ok","providers":{"openai":"...","meta":"..."}}
curl http://localhost:8001/health     # mock da Meta
```

### Handshake do webhook
```bash
curl "http://localhost:8000/webhook?hub.mode=subscribe&hub.verify_token=meu-verify-token-secreto&hub.challenge=12345"
# -> 12345
```

### Fluxo ponta a ponta (mensagem do cliente, via mock)
```bash
curl -X POST http://localhost:8001/simulate/inbound \
  -H "Content-Type: application/json" \
  -d '{ "from": "5511999990000", "text": "Quais são os planos de vocês?" }'

curl http://localhost:8001/sent        # resposta gerada (quando META_MODE aponta ao mock)
```

### Idempotência (reentrega com mesmo id)
```bash
curl -X POST http://localhost:8001/simulate/inbound \
  -H "Content-Type: application/json" \
  -d '{ "from": "5511999990000", "text": "oi", "id": "wamid.FIXO-1" }'
# repita o MESMO comando: não gera segunda resposta (1 só outbound)
```

### Assinatura inválida (deve dar 403)
```bash
curl -i -X POST http://localhost:8000/webhook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=invalida" \
  -d '{"object":"x","entry":[]}'
```

### REST (escopo por tenant)
```bash
TENANT=11111111-1111-1111-1111-111111111111
curl -H "X-Tenant-Id: $TENANT" http://localhost:8000/conversations          # ok
curl -H "X-Tenant-Id: $TENANT" http://localhost:8000/conversations/<id>/messages
curl -i http://localhost:8000/conversations                                  # 401 sem tenant
```

### Function calling (status de pedido)
```bash
curl -X POST http://localhost:8001/simulate/inbound \
  -H "Content-Type: application/json" \
  -d '{ "from": "5511999990000", "text": "Qual o status do pedido PED-1001?" }'
curl http://localhost:8001/sent
```

## Segurança e rate limit

### Headers (helmet)
```bash
curl -sI http://localhost:8000/health | grep -iE "content-security-policy|strict-transport|x-frame-options|x-content-type-options"
```

### Rate limit (throttler)
`THROTTLE_LIMIT` requisições por `THROTTLE_TTL` ms (default 100/60s). Estoura 429 ao exceder:
```bash
for i in $(seq 1 115); do
  curl -s -o /dev/null -w "%{http_code}\n" -H "X-Tenant-Id: 11111111-1111-1111-1111-111111111111" \
    http://localhost:8000/conversations
done | sort | uniq -c        # ~100x 200 e o restante 429
```

## Retry + DLQ (resiliência) — teste ao vivo

Force falhas de envio recriando o worker com Meta inacessível e visibility baixo:
```bash
cat > /tmp/override.dlq.yml <<'EOF'
services:
  worker:
    environment:
      META_API_BASE_URL: http://invalid.invalid:9999
      SQS_VISIBILITY_TIMEOUT: "4"
EOF
docker compose -f docker-compose.yml -f /tmp/override.dlq.yml up -d --no-deps worker

# injete uma mensagem (mock) e acompanhe as retentativas
docker compose logs -f worker | grep "falha ao processar"   # Ctrl+C após algumas

# após SQS_MAX_RECEIVE_COUNT (3) tentativas, a mensagem vai para a DLQ:
DLQ=$(docker compose exec -T localstack awslocal sqs get-queue-url --queue-name atendimento-jobs-dlq --query QueueUrl --output text)
docker compose exec -T localstack awslocal sqs get-queue-attributes --queue-url "$DLQ" --attribute-names ApproximateNumberOfMessages

# restaure o worker:
docker compose up -d --no-deps worker
```

## Auditoria (separada por status)

```bash
docker compose exec postgres psql -U postgres -d atendimento \
  -c "select outcome, count(*) from audit_logs group by outcome;"          # success e error
docker compose exec postgres psql -U postgres -d atendimento \
  -c "select method, path, status_code, outcome, duration_ms from audit_logs order by created_at desc limit 10;"
```
Erros de guard (403 assinatura, 401 sem tenant) também aparecem como `error` com o status correto.

## Modo real (OpenAI + Meta)

No `.env` da raiz:
```dotenv
OPENAI_MODE=real
OPENAI_API_KEY=sk-proj-...           # chave com saldo
META_MODE=real
META_TOKEN=EAA...                    # token (System User token p/ não expirar)
META_API_BASE_URL=https://graph.facebook.com/v21.0
META_PHONE_NUMBER_ID=<phone_number_id real>
```
Recompile (`API_HOST_PORT=8080 docker compose up -d --build`) e confira `/health`
(`openai: real`, `meta: real`). Para disparar ao número de teste, injete um webhook assinado
com o `phone_number_id` real e o `wa_id` do destinatário (registrado na allow list da Meta).

## Testes

```bash
cd backend && npm test
```

## Banco

```bash
cd backend
npm run db:generate   # gera migration a partir do schema
npm run db:migrate    # aplica
npm run db:seed       # tenant default (idempotente)
```
