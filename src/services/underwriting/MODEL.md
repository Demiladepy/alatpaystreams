# ALATPay Streams — Working Capital Underwriting Model

**Document type:** Credit policy memo (v1)  
**Audience:** Wema Bank credit officers, risk committee  
**Product:** ALATPay Streams merchant cash advance  
**Data source:** 90-day ALATPay inbound transaction history per merchant  

---

## 1. Purpose

ALATPay Streams routes every customer payment into merchant-defined buckets (tax, savings, suppliers, owner pay, loan repayment). When a merchant needs short-term working capital, we offer an advance repaid automatically as a percentage of future ALATPay inflows.

This memo describes how we convert 90 days of payment data into an **eligible / ineligible** decision, **offer size**, **fee**, and **repayment percentage**. Every number is traceable to observable transaction behaviour — not a black-box ML score.

---

## 2. Data inputs

For each merchant we analyse all ALATPay transactions in the **last 90 days**:

| Field | Use |
|-------|-----|
| Transaction amount | Volume, growth, concentration |
| Timestamp | Tenure, daily velocity, structuring patterns |
| Customer identifier | Concentration risk |
| Refund flag / negative amounts | Dispute and quality signal |
| Settlement status | Operational reliability |

We also check **merchant context** outside the transaction file:

- No **active** loan outstanding  
- ALATPay account status is not **frozen**  
- No loan offer sent in the **last 7 days** (anti-spam)  
- Offers expire after **1 hour** if not accepted  

---

## 3. The seven signals

Each signal produces a score from **0.0 (weak)** to **1.0 (strong)**. A weighted composite determines eligibility and pricing tier.

### 3.1 Volume (25%)

**Intent:** Merchants with meaningful, repeatable inflow can support repayment.

- Measure: total inbound volume in the **last 30 days**
- **Floor:** ₦200,000 — below this we do not underwrite (file too thin)
- Score scales **log-linearly** from ₦200k (0.0) to ₦5M (1.0) so that doubling volume from ₦500k matters more than doubling from ₦3M

### 3.2 Growth (20%)

**Intent:** Stable or growing businesses repay; sharp declines and artificial spikes are risky.

- Measure: last-30-day volume ÷ prior-30-day volume
- For merchants with **less than 75 days** on ALATPay, prior-window volume is **pro-rated to a 30-day equivalent** so new businesses are not misclassified as declining when the prior calendar window only partially overlaps their operating history
- &lt; 0.8 → 0.0 (declining — **automatic decline**)
- 0.8 – 1.0 → 0.4 (flat)
- 1.0 – 1.3 → 0.8 (healthy growth)
- &gt; 1.3 → 1.0 (strong growth)
- &gt; 3.0 → 0.6 signal score but **automatic hold for manual review** (possible layering or one-off spike)

### 3.3 Velocity consistency (15%)

**Intent:** Steady daily sales imply predictable repayment capacity.

- Measure: coefficient of variation (CoV) of **daily transaction counts** over 30 days
- CoV &lt; 0.4 → 1.0 (very steady)
- CoV &gt; 1.2 → 0.0 (erratic)
- Linear interpolation between

### 3.4 Customer concentration (15%)

**Intent:** If one buyer is the business, their departure causes default.

- Measure: largest customer's share of last-30-day volume
- &lt; 20% → 1.0
- 20% – 40% → 0.6
- 40% – 60% → 0.3
- &gt; 60% → 0.0 signal score and **automatic decline**

### 3.5 Refund rate (10%)

**Intent:** Elevated refunds indicate disputes, quality issues, or chargeback risk.

- Measure: refunds ÷ gross inbound volume (90-day window)
- &lt; 2% → 1.0
- 2% – 5% → 0.7
- 5% – 10% → 0.3
- &gt; 10% → 0.0 and **automatic decline**

### 3.6 Tenure (10%)

**Intent:** Longer history reduces uncertainty about seasonality and fraud.

- Measure: days since first ALATPay transaction in the 90-day extract
- &lt; 30 days → 0.2
- 30 – 60 days → 0.5
- 60 – 90 days → 0.8
- &gt; 90 days → 1.0

### 3.7 Settlement reliability (5%)

**Intent:** Failed or retried settlements suggest operational or fraud friction.

- Measure: % of payment attempts that settled without failure or retry
- ≥ 98% → 1.0
- &lt; 98% → 0.0 and **automatic decline**

---

## 4. Composite score

```
Score = 0.25×Volume + 0.20×Growth + 0.15×Velocity + 0.15×Concentration
      + 0.10×Refund + 0.10×Tenure + 0.05×Settlement
```

Result is between **0.0 and 1.0**.

---

## 5. Eligibility and pricing tiers

| Composite score | Decision | Pricing tier |
|-----------------|----------|--------------|
| &lt; 0.45 | **Ineligible** | — |
| 0.45 – 0.60 | Eligible | **Conservative** (5% base fee) |
| 0.60 – 0.80 | Eligible | **Standard** (4% base fee) |
| &gt; 0.80 | Eligible | **Preferred** (3% base fee) |

Additional **hard declines** (regardless of score):

- Active loan outstanding  
- Frozen ALATPay account  
- Offer in the last 7 days  
- Volume below ₦200k / 30 days  
- Top customer &gt; 60% of volume  
- Growth ratio &lt; 0.8 (declining sales)  
- Growth ratio &gt; 3.0 (manual review)  
- Refund rate &gt; 10%  
- Settlement reliability &lt; 98%  
- &gt; 30 identical-amount transactions in a single day (structuring flag)  

---

## 6. Offer sizing

**Maximum principal** is the minimum of three caps:

1. **30% of last-30-day volume** — we never lend more than roughly one third of a month's sales  
2. **₦2,000,000 hard cap** (v1 product limit)  
3. **Score × ₦3,000,000** — stronger files get headroom; weaker files get a lower ceiling  

**Suggested offer** = 70% of maximum. The merchant can ask for more up to the max; this preserves a sense of control and allows the AI to negotiate upward within policy.

---

## 7. Fee pricing

Base fee depends on tier (3% / 4% / 5% of principal).

**Add-ons** (+0.5% each, stackable):

- Tenure &lt; 60 days (limited history)  
- Growth signal score &lt; 0.5 (weak momentum)  

Fee is rounded **up to the nearest ₦500**.

**Example:** ₦400,000 offer, standard tier (4%), 75-day tenure, growth signal 0.8 → 4% × ₦400,000 = **₦16,000** (no add-ons).

---

## 8. Repayment percentage

Each future ALATPay payment contributes a fixed percentage to loan repayment:

```
Repayment % = (Principal + Fee) ÷ (Expected next-30-day volume × 0.7)
```

Capped at **20%** per transaction so the merchant retains operating cash.

The 0.7 haircut assumes not every naira of historical volume repeats — conservative collection planning.

**Self-balancing behaviour:** high-volume merchants repay faster in calendar days; thinner merchants repay slower but at a lower % per sale.

---

## 9. Expected repayment horizon

For disclosure in the offer:

```
Expected days ≈ (Principal + Fee) ÷ (Average daily volume × Repayment %)
```

Where average daily volume = last-30-day volume ÷ 30.

Example copy shown to merchant: *"You'll likely repay this in ~22 days based on your sales pace."*

---

## 10. Explainability

Every decision produces a structured explanation string for the AI co-pilot, e.g.:

> Your ALATPay volume hit ₦1.4M last month, up 22% from prior. Steady daily sales (CoV 0.3), refund rate 1.2%, top customer at 18% share. That qualifies you for ₦400,000 at ₦16,000 fee — likely repaid in 22 days at 12% per sale.

The credit officer can reconcile each clause to the signal definitions above.

---

## 11. Safety rails summary

| Rail | Rationale |
|------|-----------|
| No offer with active loan | Prevents stacking / over-leverage |
| Frozen account block | Cannot disburse or collect |
| 7-day offer cooldown | Prevents AI spam |
| 1-hour offer expiry | Time-bound acceptance |
| Structuring detection | AML / layering risk |
| 20% repayment cap | Merchant liquidity preservation |
| ₦2M hard cap | v1 concentration limit |

---

## 12. Model governance

- **Version:** 1.0 (heuristic scorecard — not machine learning)  
- **Review cadence:** Quarterly with portfolio performance data  
- **Change control:** Threshold and weight changes require risk sign-off  
- **Audit trail:** Every eligibility check logs signal values, composite score, tier, and explanation via the orchestrator tool layer  

---

*Prepared for ALATPay Streams demo and Wema Bank partnership review. Implementation: `src/services/underwriting/`.*
