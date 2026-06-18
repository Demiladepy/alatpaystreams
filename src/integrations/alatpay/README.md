# ALATPay Integration — Demo-Day Runbook

This module is the **only** place that knows whether ALATPay is up, down, or weird. The rest of the app imports `alatpayService` from `src/integrations/alatpay`.

## Environment

| Variable | Purpose |
|----------|---------|
| `ALATPAY_BASE_URL` | API base (mock: `http://localhost:5500`) |
| `ALATPAY_API_KEY` | Bearer token for production |
| `ALATPAY_MERCHANT_ID` | Platform merchant ID (reserved) |
| `ALATPAY_WEBHOOK_SECRET` | HMAC secret for webhook verification |
| `ALATPAY_USE_MOCK` | `true` → proxy to local mock contract |

**Demo day:** `ALATPAY_USE_MOCK=false`. The startup log prints the active mode in obvious text.

## Health check

```bash
curl http://localhost:3000/api/alatpay/health
```

Returns circuit breaker state + `lastSuccessfulCallAt`.

## Known quirks & how we handle them

| Quirk | Handling |
|-------|----------|
| API returns HTTP 200 with `"status": "failed"` in body | `mapPayoutResponse` treats as failure; cached via idempotency key |
| Webhook signature header is `X-AlatPay-Signature` on prod, `alatpay-signature` on staging | `extractSignatureFromHeaders` checks both (+ embedded body sig for mock) |
| Mock signs `{event,timestamp,data}` not raw bytes | `verifyContractWebhookSignature` |
| Production may sign raw body bytes | `verifyRawBodyWebhookSignature` fallback |
| Payout returns 504 but disbursement succeeded | On 504, recover from Redis idempotency cache (`reference` key) |
| Webhooks arrive 2–3× | Redis dedupe on `transactionId` (24h TTL); released on 500 so ALATPay retry works |
| Retries could double-disburse | `Idempotency-Key` header + Redis cache of payout response (24h) |
| 5xx / network flakiness | Exponential backoff: 250ms → 500ms → 1.2s → 2.8s (4 retries, jitter) |
| 4xx client errors | **No retry** — fails immediately |
| 5 consecutive payout failures | Circuit opens 60s → `ALATPayCircuitOpenError` (fail fast) |
| Requests hang | 6-second hard timeout per HTTP call |

## Endpoints

| Route | Purpose |
|-------|---------|
| `POST /webhooks/alatpay` | Primary webhook (raw body for signature) |
| `POST /api/webhooks/alatpay` | Legacy alias (JSON parsed) |
| `GET /api/alatpay/health` | Circuit + last success timestamp |

## Live testing checklist

1. ☐ Create a test merchant account on ALATPay sandbox/staging
2. ☐ Trigger a real customer payment to that account
3. ☐ Verify webhook lands on `/webhooks/alatpay` with correct signature
4. ☐ Trigger a payout from our side to a test recipient
5. ☐ Verify webhook arrives confirming the payout
6. ☐ Test idempotency: send the same payout twice, confirm only one disbursement
7. ☐ Test circuit breaker by temporarily pointing `ALATPAY_BASE_URL` at a dead host

## When things go wrong on stage

1. Hit `/api/alatpay/health` — is circuit open?
2. Check Redis is up (idempotency + dedupe depend on it)
3. Tail logs for `ALATPay payout retry` / `idempotency cache hit`
4. If mock mode banner appeared at startup → fix `ALATPAY_USE_MOCK` and restart

## Retiring the mock

The mock on `:5500` implements the same HTTP contract. When production credentials work:

1. Set `ALATPAY_USE_MOCK=false`
2. Point `ALATPAY_BASE_URL` at ALATPay production/staging
3. No other code changes — `alatpayService` interface is frozen
