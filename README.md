# ALATPay Streams

Programmable income routing backend for Nigerian SMEs. Incoming payments are split across tax reserves, savings, supplier payments, owner salary, loan repayments, and custom buckets according to merchant-defined rules.

## Stack

- Node.js 20+ / TypeScript
- Express 5
- PostgreSQL via Prisma
- Redis (pub/sub for live dashboard updates)
- Jest for unit tests

## Local development

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts:

| Service  | Port | Credentials                          |
|----------|------|--------------------------------------|
| Postgres | 5432 | user `alatpay` / password `alatpay` / db `alatpaystreams` |
| Redis    | 6379 | no auth                              |

### 2. Configure environment

```bash
cp .env.example .env
```

Default values in `.env.example` match the Docker Compose services.

### 3. Install dependencies and set up the database

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Run the API

```bash
npm run dev
```

The server listens on `http://localhost:3000`.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/merchants` | Create a merchant |
| `POST` | `/api/buckets` | Create a bucket for a merchant |
| `GET` | `/api/merchants/:id/buckets` | List active buckets with balances |
| `GET` | `/api/merchants/:id/transactions?limit=50` | Recent transactions with splits |
| `POST` | `/api/transactions/simulate` | Apply a split for `{ merchantId, amountNaira }` |

### Example flow

```bash
# Create merchant
curl -X POST http://localhost:3000/api/merchants \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Foods","phone":"+2348098765432","email":"owner@acme.ng"}'

# Create a 10% tax bucket
curl -X POST http://localhost:3000/api/buckets \
  -H "Content-Type: application/json" \
  -d '{"merchantId":"<id>","name":"VAT","type":"TAX","rule":{"kind":"PERCENTAGE","value":10},"priority":1}'

# Simulate a ₦50,000 payment split
curl -X POST http://localhost:3000/api/transactions/simulate \
  -H "Content-Type: application/json" \
  -d '{"merchantId":"<id>","amountNaira":50000}'
```

## Split engine

`src/services/splitEngine.ts` is a pure function with no database or side effects:

1. **FIXED** buckets are applied first (by priority), capped at the remaining amount.
2. **WEEKLY_FIXED** buckets behave like FIXED but only on their configured `dayOfWeek` (0 = Sunday … 6 = Saturday).
3. **PERCENTAGE** buckets each take their `value`% of the post-FIXED remainder.
4. Any unallocated funds go to a virtual **Merchant Operating** bucket (`bucketId: null`).
5. Amounts are rounded to 2 decimal places using banker's rounding; the largest split absorbs any rounding remainder so the total always equals the input exactly.

`src/services/applySplit.ts` wraps this in a Prisma transaction: inserts the transaction and splits, updates bucket balances, appends a ledger event, and publishes to Redis channel `tx:{merchantId}`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm test` | Run Jest unit tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo merchant and buckets |

## Tests

```bash
npm test
```

Split engine tests cover pure percentage splits, partial percentage allocation, FIXED + PERCENTAGE combinations, FIXED capping, WEEKLY_FIXED day logic, and rounding reconciliation.

## Project structure

```
src/
  index.ts              Express entry
  routes/               REST endpoints
  services/             splitEngine, applySplit
  lib/                  db, redis, logger
  types/
prisma/
  schema.prisma
tests/
```
