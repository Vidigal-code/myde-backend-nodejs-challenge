# Runbook — operar e testar

## Subir tudo (Docker)

```bash
docker compose up -d --build
docker compose ps           # postgres, localstack, mock-meta, api, worker
docker compose logs -f api worker
```

A `api` roda migrations + seed automaticamente antes de iniciar.

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

### Fluxo ponta a ponta (mensagem do cliente)
```bash
curl -X POST http://localhost:8001/simulate/inbound \
  -H "Content-Type: application/json" \
  -d '{ "from": "5511999990000", "text": "Quais são os planos de vocês?" }'

curl http://localhost:8001/sent        # resposta gerada que a "Meta" recebeu
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
curl -H "X-Tenant-Id: $TENANT" http://localhost:8000/conversations
curl -H "X-Tenant-Id: $TENANT" http://localhost:8000/conversations/<id>/messages
```

### Function calling (status de pedido)
```bash
curl -X POST http://localhost:8001/simulate/inbound \
  -H "Content-Type: application/json" \
  -d '{ "from": "5511999990000", "text": "Qual o status do pedido PED-1001?" }'
curl http://localhost:8001/sent
```

## DLQ (resiliência)

Para forçar falha de envio e ver a DLQ encher, rode com `META_MODE=real` e
`META_API_BASE_URL` inválido. Após `SQS_MAX_RECEIVE_COUNT` tentativas:

```bash
docker compose exec localstack \
  awslocal sqs receive-message \
  --queue-url http://localhost:4566/000000000000/atendimento-jobs-dlq
```

## Auditoria

```bash
docker compose exec postgres psql -U postgres -d atendimento \
  -c "select method, path, status_code, outcome, duration_ms from audit_logs order by created_at desc limit 10;"
```

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
