import Decimal from 'decimal.js';

/** Minimum last-30-day volume to underwrite (₦200,000). Below this the file is too thin. */
export const VOLUME_FLOOR_NAIRA = 200_000;

/** Log-linear volume ceiling for full signal score (₦5,000,000). */
export const VOLUME_CEILING_NAIRA = 5_000_000;

/** Hard cap on principal for v1. */
export const MAX_PRINCIPAL_CAP_NAIRA = 2_000_000;

/** Score-gated ceiling multiplier (score × this value). */
export const SCORE_CEILING_MULTIPLIER_NAIRA = 3_000_000;

/** Max principal as fraction of last-30-day volume. */
export const VOLUME_LEND_RATIO = 0.3;

/** Suggested offer as fraction of max offer (merchant can ask for more). */
export const SUGGESTED_OFFER_RATIO = 0.7;

/** Composite score below this → ineligible. */
export const ELIGIBILITY_MIN_SCORE = 0.45;

/** Tier boundaries on composite score (0–1). */
export const TIER_STANDARD_MIN = 0.6;
export const TIER_PREFERRED_MIN = 0.8;

/** Signal weights — must sum to 1.0. */
export const SIGNAL_WEIGHTS = {
  volume: 0.25,
  growth: 0.2,
  velocityConsistency: 0.15,
  customerConcentration: 0.15,
  refundRate: 0.1,
  tenure: 0.1,
  settlementReliability: 0.05,
} as const;

/** Growth ratio thresholds (last-30 ÷ prior-30 volume). */
export const GROWTH_DECLINING_MAX = 0.8;
export const GROWTH_FLAT_MAX = 1.0;
export const GROWTH_HEALTHY_MAX = 1.3;
export const GROWTH_SUSPICIOUS_SPIKE_MIN = 3.0;

/** Velocity consistency — coefficient of variation of daily tx counts. */
export const VELOCITY_COV_EXCELLENT = 0.4;
export const VELOCITY_COV_POOR = 1.2;

/** Customer concentration bands (top customer ÷ last-30 volume). */
export const CONCENTRATION_WELL_DIVERSIFIED = 0.2;
export const CONCENTRATION_MODERATE = 0.4;
export const CONCENTRATION_HIGH = 0.6;

/** Refund rate bands (refunds ÷ gross volume). */
export const REFUND_EXCELLENT = 0.02;
export const REFUND_ACCEPTABLE = 0.05;
export const REFUND_ELEVATED = 0.1;

/** Settlement reliability minimum for a non-zero signal. */
export const SETTLEMENT_RELIABILITY_MIN = 0.98;

/** Base fee rates by pricing tier. */
export const FEE_RATES = {
  preferred: new Decimal('0.03'),
  standard: new Decimal('0.04'),
  conservative: new Decimal('0.05'),
} as const;

/** Add-on fee increments. */
export const FEE_SHORT_TENURE_ADDON = new Decimal('0.005');
export const FEE_WEAK_GROWTH_ADDON = new Decimal('0.005');
export const FEE_ROUNDING_STEP_NAIRA = 500;

/** Repayment cap — never take more than 20% of a single inbound payment. */
export const MAX_REPAYMENT_PERCENTAGE = 20;

/** Expected collection horizon factor for repayment % sizing. */
export const REPAYMENT_VOLUME_HAIRCUT = 0.7;

/** Structuring: same-amount tx count in one day that triggers a block. */
export const STRUCTURING_SAME_AMOUNT_DAILY_LIMIT = 30;

/** Minimum days between loan offers to the same merchant. */
export const OFFER_COOLDOWN_DAYS = 7;

/** Offer TTL — enforced elsewhere (loanUtils). */
export const OFFER_TTL_HOURS = 1;

export type PricingTier = keyof typeof FEE_RATES;

export function tierFromScore(score: Decimal): PricingTier | null {
  if (score.lt(ELIGIBILITY_MIN_SCORE)) return null;
  if (score.gte(TIER_PREFERRED_MIN)) return 'preferred';
  if (score.gte(TIER_STANDARD_MIN)) return 'standard';
  return 'conservative';
}
