import Decimal from 'decimal.js';
import {
  FEE_RATES,
  FEE_ROUNDING_STEP_NAIRA,
  FEE_SHORT_TENURE_ADDON,
  FEE_WEAK_GROWTH_ADDON,
  MAX_PRINCIPAL_CAP_NAIRA,
  MAX_REPAYMENT_PERCENTAGE,
  REPAYMENT_VOLUME_HAIRCUT,
  SCORE_CEILING_MULTIPLIER_NAIRA,
  SUGGESTED_OFFER_RATIO,
  VOLUME_LEND_RATIO,
  type PricingTier,
} from './constants';
import type { ComputedSignals } from './signals';

export interface OfferTerms {
  maxOfferNaira: number;
  suggestedOfferNaira: number;
  feeNaira: number;
  repaymentPercentage: number;
  expectedRepaymentDays: number;
  tier: PricingTier;
}

function roundFeeUp(fee: Decimal): number {
  const step = new Decimal(FEE_ROUNDING_STEP_NAIRA);
  return fee.div(step).ceil().mul(step).toDecimalPlaces(0, Decimal.ROUND_CEIL).toNumber();
}

/**
 * Max offer = min(30% of last-30 volume, ₦2M hard cap, score × ₦3M ceiling).
 * Suggested = 70% of max — merchant can negotiate up.
 */
export function sizeOffer(
  last30VolumeNaira: number,
  compositeScore: Decimal,
): { maxOfferNaira: number; suggestedOfferNaira: number } {
  const volume = new Decimal(last30VolumeNaira);
  const volumeCap = volume.mul(VOLUME_LEND_RATIO);
  const hardCap = new Decimal(MAX_PRINCIPAL_CAP_NAIRA);
  const scoreCap = compositeScore.mul(SCORE_CEILING_MULTIPLIER_NAIRA);

  const maxOffer = Decimal.min(volumeCap, hardCap, scoreCap).toDecimalPlaces(
    0,
    Decimal.ROUND_DOWN,
  );

  const suggested = maxOffer
    .mul(SUGGESTED_OFFER_RATIO)
    .toDecimalPlaces(0, Decimal.ROUND_DOWN);

  return {
    maxOfferNaira: maxOffer.toNumber(),
    suggestedOfferNaira: suggested.toNumber(),
  };
}

/**
 * Base fee 3% / 4% / 5% by tier; +0.5% if tenure < 60d or growth signal < 0.5.
 * Rounded up to nearest ₦500.
 */
export function priceFee(
  principalNaira: number,
  tier: PricingTier,
  signals: ComputedSignals,
): number {
  let rate = FEE_RATES[tier];
  if (signals.tenureDays < 60) {
    rate = rate.plus(FEE_SHORT_TENURE_ADDON);
  }
  if (signals.growth < 0.5) {
    rate = rate.plus(FEE_WEAK_GROWTH_ADDON);
  }
  return roundFeeUp(new Decimal(principalNaira).mul(rate));
}

/**
 * Repayment % = (principal + fee) / (expected next-30-day volume × 0.7), capped at 20%.
 */
export function computeRepaymentPercentage(
  principalNaira: number,
  feeNaira: number,
  expectedNext30DayVolumeNaira: number,
): number {
  const owed = new Decimal(principalNaira).plus(feeNaira);
  const expectedCollections = new Decimal(expectedNext30DayVolumeNaira).mul(
    REPAYMENT_VOLUME_HAIRCUT,
  );

  if (expectedCollections.lte(0)) {
    return MAX_REPAYMENT_PERCENTAGE;
  }

  const pct = owed.div(expectedCollections).mul(100);
  return Decimal.min(pct, MAX_REPAYMENT_PERCENTAGE)
    .toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/**
 * Expected days = (principal + fee) / (avg daily volume × repayment fraction).
 */
export function computeExpectedRepaymentDays(
  principalNaira: number,
  feeNaira: number,
  last30VolumeNaira: number,
  repaymentPercentage: number,
): number {
  const owed = new Decimal(principalNaira).plus(feeNaira);
  const avgDaily = new Decimal(last30VolumeNaira).div(30);
  const repaymentFraction = new Decimal(repaymentPercentage).div(100);

  if (avgDaily.lte(0) || repaymentFraction.lte(0)) {
    return 999;
  }

  const dailyCollection = avgDaily.mul(repaymentFraction);
  return owed
    .div(dailyCollection)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function buildOfferTerms(
  signals: ComputedSignals,
  compositeScore: Decimal,
  tier: PricingTier,
): OfferTerms {
  const sizing = sizeOffer(signals.last30DaysVolumeNaira, compositeScore);
  const principal = sizing.suggestedOfferNaira;
  const feeNaira = priceFee(principal, tier, signals);
  const repaymentPercentage = computeRepaymentPercentage(
    principal,
    feeNaira,
    signals.last30DaysVolumeNaira,
  );
  const expectedRepaymentDays = computeExpectedRepaymentDays(
    principal,
    feeNaira,
    signals.last30DaysVolumeNaira,
    repaymentPercentage,
  );

  return {
    ...sizing,
    feeNaira,
    repaymentPercentage,
    expectedRepaymentDays,
    tier,
  };
}
