# Security Audit — 2026-06-18

Pre-demo defensive sweep for ALATPay Streams.

## Fixed in this pass

1. **Input validation (Zod)** on `POST /api/chat`, `/api/chat/voice`, `/api/transactions/simulate`, `/api/buckets`.
2. **Voice hardening** — Redis rate limit (10/min/merchant), temp file cleanup in `finally`, 8s Whisper timeout, structured response.
3. **`acceptLoan` integrity** — payout runs **before** loan marked ACTIVE; failed payout no longer leaves orphan ACTIVE loans.
4. **Startup env check** — fails fast on missing `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ALATPAY_API_KEY` (unless mock).
5. **ALATPAY MODE banner** — impossible-to-miss log block on boot.
6. **`GET /health`** — postgres, redis, anthropic, openai, whatsapp, circuit, git sha.
7. **CORS allow-list** — no wildcard in production path.
8. **Consistent error JSON** — `{ error: { code, message } }` on validation and global handler.
9. **UI secrets** — no hardcoded API keys in frontend; `.env.example` includes `FRONTEND_URL` + `OPENAI_API_KEY`.

## Verified (no change needed)

- Webhook signature verification runs **first** on raw body (`/webhooks/alatpay`, `/webhooks/whatsapp`).
- WhatsApp signature uses HMAC compare via `verifyWhatsAppSignature`.
- ALATPay webhook uses `verifyWebhookSignature` before JSON parse.
- `applySplit` wrapped in `prisma.$transaction`; Redis publish failure after commit is acceptable (animation may miss, DB correct).
- No `TODO`/`FIXME`/`HACK` in `src/`.

## Deferred / known risks

| Risk | Severity | Notes |
|---|---|---|
| No API auth | High (prod) | Acceptable for hackathon demo |
| CORS on SSE stream router still uses `CORS_ORIGIN ?? '*'` | Medium | Tighten to match main CORS |
| Onboarding pages still old palette | Low | Judges unlikely to visit |
| `docs/ui-evolution.png` | Low | Before/after screenshot not generated in CI |
| WhatsApp not E2E proven | Medium | Dashboard voice is primary demo path |
| Anthropic 429 | Medium | Orchestrator should surface retry message — verify live |

## Pre-pitch ritual

```bash
curl http://localhost:3000/health | jq
```

Confirm: `postgres: connected`, `redis: connected`, `anthropic: configured`, `openai: configured`, `alatpayMode` matches intent.
