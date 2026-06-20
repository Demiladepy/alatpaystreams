# API Inventory — ALATPay Streams

Generated for demo-day security review. All routes verified against Express wiring in `src/index.ts`.

| Method | Path | Auth | Body schema | Rate limited? | Status |
|---|---|---|---|---|---|
| GET | `/health` | None | — | No | OK — full status object |
| GET | `/api/merchants/:id/buckets` | None | — | No | OK |
| GET | `/api/merchants/:id/transactions` | None | — | No | OK |
| GET | `/api/merchants/:id/loans` | None | — | No | OK |
| GET | `/api/merchants/:id/stream` | None (SSE) | — | No | OK — CORS via stream router |
| POST | `/api/merchants` | None | Manual | No | OK — create merchant |
| POST | `/api/buckets` | None | Zod `createBucketSchema` | No | OK — pct total ≤ 100% |
| POST | `/api/transactions/simulate` | None | Zod `simulateTransactionSchema` | No | OK — positive amounts |
| POST | `/api/chat` | None | Zod `chatMessageSchema` | No | OK — 1–4000 chars |
| POST | `/api/chat/voice` | None | Multipart + Zod merchantId | **Yes — 10/min/merchant (Redis)** | OK — mime, 5MB, Whisper timeout |
| GET | `/api/uptime` | None | — | No | OK |
| GET | `/api/uptime/:bankCode` | None | — | No | OK |
| GET | `/api/uptime/:bankCode/history` | None | — | No | OK |
| GET | `/api/alatpay/health` | None | — | No | OK — circuit breaker state |
| POST | `/api/webhooks` | Signature | Raw JSON | No | OK — ALATPay verify first |
| POST | `/api/webhooks/alatpay` | Signature | Raw JSON | No | OK — alias |
| POST | `/webhooks/alatpay` | Signature | Raw JSON | No | OK — raw body + verify |
| GET | `/webhooks/whatsapp` | Verify token | — | No | OK — Meta challenge |
| POST | `/webhooks/whatsapp` | HMAC signature | Raw JSON | No | OK — verify first |

## Error shape

Body-accepting routes return `{ error: { code, message } }` on validation failures. Unhandled errors logged with pino at ERROR level.

## Notes for judges

- **No API authentication** — demo merchant ID is public; add JWT before production.
- **CORS** — allow-list: `localhost:3001` + `FRONTEND_URL`.
- **Mock mode** — startup banner + `/health.alatpayMode` field.
