# ALATPay Integration — where it lives, how it flows, what to show the judges

This is the map for demonstrating ALATPay inside ALATPay Streams. Every claim below points to a real file in this repo, and the "what's real" section is honest about what runs live vs. what's modelled.

---

## 0. The 30-second answer

> ALATPay is our **payment rail on both sides of the ledger**. Money comes **in** through ALATPay virtual accounts (real Wema accounts created by the ALATPay API); the moment a payment lands, ALATPay's webhook triggers our **split engine**, which routes that single Naira amount into programmable buckets — tax, savings, supplier, salary, loan repayment. Money goes **out** through the same rail, orchestrated by an **AI co-pilot** that speaks natural language and calls ALATPay on the merchant's behalf. And we turned ALATPay's own settlement telemetry into a **bank uptime predictor** — the merchant counterpart to Wema's Uptime Prediction pillar.

---

## 1. How ALATPay is integrated — the single boundary

Everything ALATPay lives behind one module: [`src/integrations/alatpay/`](../src/integrations/alatpay/). Nothing else in the app talks to ALATPay directly — it imports `alatpayService` / `getOfficialALATPayClient` from here. That's the "clean integration" story engineers want to hear.

| File | What to point at |
|------|------------------|
| [`officialSdkClient.ts`](../src/integrations/alatpay/officialSdkClient.ts) | TypeScript client **mirroring the official ALATPay Python SDK** (`alatpay-sdk` on PyPI). Base `https://apibox.alatpay.ng`, auth header `Ocp-Apim-Subscription-Key` (line ~57). Real collection endpoints. |
| [`config.ts`](../src/integrations/alatpay/config.ts) | Credential resolution aligned with the official SDK (`getALATPayCredentials`, `isOfficialSdkMode`). |
| [`service.ts`](../src/integrations/alatpay/service.ts) | The resilient façade: payout, account, webhook verify/parse, health, circuit-breaker state. |
| [`client.ts`](../src/integrations/alatpay/client.ts) | HTTP client with retry + idempotency + 6s hard timeout. |
| [`signatureVerify.ts`](../src/integrations/alatpay/signatureVerify.ts) | Dual webhook-signature schemes (prod header vs staging header vs embedded body sig). |
| [`retry.ts`](../src/integrations/alatpay/retry.ts) | Exponential backoff + the circuit breaker. |
| [`redisStore.ts`](../src/integrations/alatpay/redisStore.ts) | Webhook dedupe + payout idempotency cache. |
| [`README.md`](../src/integrations/alatpay/README.md) | The demo-day runbook + every ALATPay quirk we handle. **Show this to engineers.** |

---

## 2. Which ALATPay features / SDK we used

All in [`officialSdkClient.ts`](../src/integrations/alatpay/officialSdkClient.ts), matching the official SDK's method names:

| ALATPay feature | Method → endpoint | Status |
|-----------------|-------------------|--------|
| **Virtual account** (bank-transfer collection) | `payViaVirtualAccount` → `/bank-transfer/api/v1/bankTransfer/virtualAccount` | ✅ **Real & verified** — creates live Wema (bank code `035`) accounts with our key |
| **Payment link** (hosted checkout) | `createPaymentLink` → `/merchant-onboarding/api/v1/payment/initialize` | Real endpoint; gated to Standard/Premium ALATPay tiers |
| **Transaction status** | `getTransaction`, `getTransactionViaPaymentLink` | Real |
| **Static collection wallet** (BVN + OTP, 2-step) | `initCreateStaticWallet` / `finalizeCreateStaticWallet` | Real endpoints |
| **Webhooks** | signature verify + parse in [`service.ts`](../src/integrations/alatpay/service.ts) & [`webhooks.ts`](../src/routes/webhooks.ts) | ✅ Real handling |

The auth model is ALATPay's real one: `Ocp-Apim-Subscription-Key` against the `apibox.alatpay.ng` API gateway.

**Proof you can run on stage** (creates a real Wema virtual account):
```bash
curl -s -X POST https://alatpaystreams-api.onrender.com/api/alatpay/virtual-account \
  -H "Content-Type: application/json" \
  -d '{"amount":5000,"order_id":"demo-1","customer":{"email":"demo@x.ng","first_name":"Funke","last_name":"Adebayo"}}'
# → { "status": true, "data": { "virtual_bank_account_number": "8880556xxx", "virtual_bank_code": "035", ... } }
```

---

## 3. How the payment flow works — money IN

The heart of the product. Trace it in this order:

1. **Create the collection point** — [`routes/alatpaySdk.ts`](../src/routes/alatpaySdk.ts) `POST /api/alatpay/virtual-account` → `payViaVirtualAccount` → ALATPay returns a real Wema account number.
2. **Customer pays** that account (bank transfer / card / USSD / tap).
3. **ALATPay fires a webhook** → [`routes/webhooks.ts`](../src/routes/webhooks.ts) `POST /webhooks/alatpay` (raw body, so the signature is verifiable):
   - `verifyWebhookSignature` (line ~29) — dual scheme via [`signatureVerify.ts`](../src/integrations/alatpay/signatureVerify.ts)
   - `parseWebhook` (line ~35) — normalises ALATPay's payload shape
   - `claimWebhook` (line ~42) — Redis dedupe (ALATPay retries 2–3×)
   - find merchant by `alatpayAccountId` (line ~48)
   - **`applySplit`** (line ~60)
4. **The split engine** — [`services/applySplit.ts`](../src/services/applySplit.ts):
   - `computeSplit` applies each bucket's rule by priority (line ~32)
   - increments bucket balances atomically in one Prisma transaction (line ~58)
   - **auto-repays any active loan** from the LOAN_REPAYMENT split (line ~69) — closes the loan when outstanding hits zero
   - writes a `LedgerEvent` (line ~107)
   - **`publishTxEvent`** to Redis pub/sub (line ~151)
5. **The dashboard reacts live** — SSE at [`routes/stream.ts`](../src/routes/stream.ts) `GET /api/merchants/:id/stream` pushes the event to the browser, which plays the **SplitFlow** animation.

---

## 4. What happens when a user makes a payment (say it like this)

> "A customer pays Funke ₦50,000 into her ALATPay virtual account. ALATPay settles it and calls our webhook. We verify ALATPay's signature, de-duplicate the retry, and hand it to the split engine. In one atomic step, ₦3,750 goes to VAT, ₦5,000 to savings, a supplier reserve is set aside, her salary is taken first, and 12% auto-repays her working-capital loan. Every cent is ledgered, and the dashboard animates the split in real time. She did nothing — ALATPay + Streams did it all."

---

## 5. How ALATPay shows up in the UX

| Surface | File | What the judge sees |
|---------|------|---------------------|
| **SplitFlow animation** | [`web/src/components/SplitFlow.tsx`](../web/src/components/SplitFlow.tsx) | One ALATPay payment fanning into 5 buckets |
| **Live stream** | [`web/src/hooks/useTransactionStream.ts`](../web/src/hooks/useTransactionStream.ts) | The dashboard updating the instant a payment lands (SSE) |
| **Demo trigger** | [`web/src/components/DemoBurstButton.tsx`](../web/src/components/DemoBurstButton.tsx) | Fires a payment for the demo (→ `/api/transactions/simulate`) |
| **Integration mode** | [`web/src/components/MockModeBanner.tsx`](../web/src/components/MockModeBanner.tsx) | Confirms we're in production ALATPay mode (banner absent = good) |
| **AI co-pilot** | [`web/src/app/dashboard/DashboardClient.tsx`](../web/src/app/dashboard/DashboardClient.tsx) | Natural-language control of ALATPay payouts |

---

## 6. Creative ways we used ALATPay (the "wow")

1. **Programmable split-settlement on top of ALATPay.** ALATPay moves the money; we make every Naira *programmable* the moment it lands. This is the product.
2. **An AI co-pilot that orchestrates ALATPay.** The merchant talks; Claude calls ALATPay. Loan disbursement — [`tools/acceptLoan.ts`](../src/services/tools/acceptLoan.ts); supplier payment — [`tools/confirmSupplierPayment.ts`](../src/services/tools/confirmSupplierPayment.ts); balance reads — [`tools/checkEligibility.ts`](../src/services/tools/checkEligibility.ts). This is "ALATPay AI."
3. **Auto-repayment intercepted at the rail.** Credit is repaid as a split on every incoming ALATPay payment — not chased by a collections team ([`applySplit.ts`](../src/services/applySplit.ts) line ~69).
4. **Bank Uptime Prediction from ALATPay telemetry.** Every ALATPay settlement attempt feeds `recordPayoutAttempt` in [`services/uptimeMonitor.ts`](../src/services/uptimeMonitor.ts); we forecast per-bank health from it — the merchant mirror of Wema's Uptime Prediction pillar.
5. **Production-grade resilience around ALATPay's real quirks** — dual signature schemes, "HTTP 200 with failed body", 504-recovery via idempotency cache, webhook dedupe, circuit breaker. Documented in [`integrations/alatpay/README.md`](../src/integrations/alatpay/README.md). This is what separates a real integration from a demo.

---

## What's real vs. modelled (be honest — judges respect it)

| Capability | Reality |
|-----------|---------|
| Virtual-account collection (money in) | **Real** — verified live against `apibox.alatpay.ng`, returns Wema accounts |
| ALATPay key / auth / webhook verification | **Real** |
| Split engine, ledger, auto-repayment, underwriting | **Real**, tested |
| Payment links | Real endpoint, needs a higher ALATPay tier than our account has |
| **Payouts / disbursement** (loan + supplier) | **Modelled** — ALATPay exposes no disbursement product on our account. Disbursement is marked "processing"; the loan still activates and the repayment stream is real |

---

## Go-live checklist (do these before the pitch)

- [ ] **Render env:** set `ALATPAY_BASE_URL=https://apibox.alatpay.ng` on the `alatpaystreams-api` service (it's currently `http://localhost:5500`, which breaks all live ALATPay calls). Keep `ALATPAY_USE_MOCK=false`.
- [ ] Redeploy, then confirm `GET /api/alatpay/health` shows `"baseUrl":"https://apibox.alatpay.ng"` and `"mode":"production"`.
- [ ] Run the virtual-account curl above → confirm a real `035` account comes back.
- [ ] Warm the API (`/health`) ~1 min before demo (free-tier cold start).
- [ ] Delete any open loan so the credit offer demos fresh.
- [ ] Money-in demo uses the **Demo Burst** button (deterministic). Optionally show the real virtual-account creation as the "it's genuinely ALATPay" proof.
