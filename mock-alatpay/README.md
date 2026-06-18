# Mock ALATPay

Standalone mock of the ALATPay API surface for the ALATPay Streams hackathon. This service **is the contract** — when the real API is available, write an adapter that matches these endpoints, not the other way around.

Runs on **port 5500**. No database; state lives in `./data/*.json`.

## Quick start

```bash
cd mock-alatpay
npm install
cp .env.example .env
npm run seed
npm run dev
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5500` | HTTP port |
| `WEBHOOK_URL` | — | Where to POST inbound webhooks (your backend) |
| `ALATPAY_WEBHOOK_SECRET` | `dev-webhook-secret-change-me` | HMAC secret for webhook signatures |

Example `.env`:

```env
PORT=5500
WEBHOOK_URL=http://localhost:3000/api/webhooks/alatpay
ALATPAY_WEBHOOK_SECRET=dev-webhook-secret-change-me
```

## Pointing our backend at the mock

In the ALATPay Streams backend, set a single base URL env var (when you add the adapter):

```env
ALATPAY_API_URL=http://localhost:5500
```

Your backend should call:

- `POST {ALATPAY_API_URL}/alatpay/payout` — disburse loans
- `GET  {ALATPAY_API_URL}/alatpay/account/:merchantAccountId` — balance lookup
- Register `WEBHOOK_URL` here so customer payments hit your webhook handler

**Swapping to real ALATPay later:** change `ALATPAY_API_URL` to the production base URL and implement an adapter class that exposes the same methods your code already calls. Webhook verification stays the same if ALATPay uses HMAC — adjust the signing helper only if their format differs.

## API reference

### `GET /alatpay/account/:merchantAccountId`

```json
{
  "accountId": "alatpay_funke_001",
  "accountName": "Funke Adebayo Beauty Ltd",
  "balanceNaira": 145000,
  "status": "active"
}
```

### `POST /alatpay/payout`

Body:

```json
{
  "merchantAccountId": "alatpay_funke_001",
  "amountNaira": 50000,
  "narration": "Loan disbursement",
  "reference": "LOAN-001"
}
```

Response (~400ms simulated latency):

```json
{
  "status": "successful",
  "transactionId": "ALATPAY-<uuid>",
  "amount": 50000,
  "timestamp": "2025-06-18T12:00:00.000Z",
  "balanceAfter": 95000
}
```

5% of payouts return `"status": "pending"` and settle via `payout.completed` webhook **2 seconds later**.

### `POST /alatpay/simulate-customer-payment`

Demo control surface (not a real ALATPay endpoint).

```json
{
  "merchantAccountId": "alatpay_funke_001",
  "amountNaira": 25000,
  "customerName": "Adaeze Okafor"
}
```

Creates a transaction, credits merchant balance, and fires `transaction.received` webhook to `WEBHOOK_URL` within ~200ms.

### Webhook payload

```json
{
  "event": "transaction.received",
  "timestamp": "2025-06-18T12:00:00.000Z",
  "data": {
    "transactionId": "ALATPAY-<uuid>",
    "merchantAccountId": "alatpay_funke_001",
    "amountNaira": 25000,
    "customerName": "Adaeze Okafor",
    "customerPhone": "+2348031234567",
    "channel": "card",
    "reference": "REF-..."
  },
  "signature": "<hmac-sha256 of {event,timestamp,data}>"
}
```

Verify in your backend:

```typescript
const body = JSON.stringify({ event, timestamp, data });
const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
```

### Demo controls

| Endpoint | Description |
|----------|-------------|
| `POST /demo/burst` | Fires 5 customer payments over 30 seconds (live pitch trigger) |
| `POST /demo/reset` | Resets balance to ₦145,000 and clears today's transactions |

```bash
# Make the dashboard come alive during the pitch
curl -X POST http://localhost:5500/demo/burst

# Reset between dry runs
curl -X POST http://localhost:5500/demo/reset
```

## Seed data

```bash
npm run seed
```

Generates:

- **1 merchant:** `alatpay_funke_001` — Funke Adebayo Beauty Ltd, ₦145,000 balance
- **~500 transactions** over 90 days with:
  - Volume trend: ~₦60k/day → ~₦95k/day
  - 4–9 txs/day (busier Fri/Sat, quieter Sun)
  - Log-normal ticket sizes (~₦12k mean, ~5% above ₦80k)
  - Channels: 55% card, 30% transfer, 15% ussd
  - 40 Nigerian customer names with repeat-customer signal
  - ~2% refunds
  - **Recent 7 days ~22% above prior 7 days** (underwriting signal)

Re-run `npm run seed` anytime to re-roll history.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm run seed` | Generate `data/merchants.json` + `data/transactions.json` |

## Project structure

```
src/
  index.ts
  routes/
    webhooks.ts    # Outbound webhook signing + delivery
    payout.ts
    account.ts
    alatpay.ts     # simulate-customer-payment
    demo.ts
  services/
    simulator.ts   # Payment burst + customer payment logic
    storage.ts     # JSON file persistence
  scripts/
    seed.ts
data/
  merchants.json
  transactions.json
```
