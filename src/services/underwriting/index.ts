import Decimal from 'decimal.js';
import {
  ELIGIBILITY_MIN_SCORE,
  VOLUME_FLOOR_NAIRA,
  tierFromScore,
} from './constants';
import { explainIneligibility, explainOffer } from './explainer';
import { buildOfferTerms, type OfferTerms } from './pricing';
import { scoreFromComputedSignals } from './score';
import type { ComputedSignals } from './signals';

export interface MerchantUnderwritingContext {
  hasActiveLoan: boolean;
  accountFrozen: boolean;
  recentOfferWithin7Days: boolean;
}

export interface UnderwritingResult {
  score: number;
  eligible: boolean;
  tier: OfferTerms['tier'] | null;
  reason: string;
  explanation: string;
  flags: string[];
  maxOfferNaira: number;
  suggestedOfferNaira: number;
  feeNaira: number;
  repaymentPercentage: number;
  expectedRepaymentDays: number;
  signals: ComputedSignals;
}

function emptyTerms(): Pick<
  OfferTerms,
  | 'maxOfferNaira'
  | 'suggestedOfferNaira'
  | 'feeNaira'
  | 'repaymentPercentage'
  | 'expectedRepaymentDays'
  | 'tier'
> {
  return {
    maxOfferNaira: 0,
    suggestedOfferNaira: 0,
    feeNaira: 0,
    repaymentPercentage: 0,
    expectedRepaymentDays: 0,
    tier: 'conservative',
  };
}

function ineligibleResult(
  signals: ComputedSignals,
  score: Decimal,
  reason: string,
  flags: string[] = [],
): UnderwritingResult {
  const terms = emptyTerms();
  return {
    score: score.toNumber(),
    eligible: false,
    tier: null,
    reason,
    explanation: explainIneligibility(signals, score.toNumber(), reason),
    flags,
    maxOfferNaira: terms.maxOfferNaira,
    suggestedOfferNaira: terms.suggestedOfferNaira,
    feeNaira: terms.feeNaira,
    repaymentPercentage: terms.repaymentPercentage,
    expectedRepaymentDays: terms.expectedRepaymentDays,
    signals,
  };
}

export function evaluateUnderwriting(
  signals: ComputedSignals,
  context: MerchantUnderwritingContext,
): UnderwritingResult {
  const score = scoreFromComputedSignals(signals);
  const flags: string[] = [];

  if (context.hasActiveLoan) {
    return ineligibleResult(
      signals,
      score,
      'You already have an active loan. Finish repaying before taking another.',
    );
  }

  if (context.accountFrozen) {
    return ineligibleResult(
      signals,
      score,
      'Your ALATPay account is frozen — we cannot extend credit until it is active again.',
    );
  }

  if (context.recentOfferWithin7Days) {
    return ineligibleResult(
      signals,
      score,
      'You received a loan offer in the last 7 days. We can revisit once that cooling period ends.',
    );
  }

  if (signals.structuringFlag) {
    flags.push('STRUCTURING_SUSPECTED');
    return ineligibleResult(
      signals,
      score,
      'Unusual same-amount transaction pattern detected — flagged for manual review before any offer.',
      flags,
    );
  }

  if (signals.suspiciousGrowthSpike) {
    flags.push('GROWTH_SPIKE_REVIEW');
    return ineligibleResult(
      signals,
      score,
      'Sales jumped unusually fast — we need a manual review before extending credit.',
      flags,
    );
  }

  if (signals.topCustomerShare > 0.6) {
    return ineligibleResult(
      signals,
      score,
      `Top customer is ${(signals.topCustomerShare * 100).toFixed(0)}% of sales — dependency risk is too high.`,
    );
  }

  if (signals.last30DaysVolumeNaira < VOLUME_FLOOR_NAIRA) {
    return ineligibleResult(
      signals,
      score,
      `Sales volume is too thin (₦${signals.last30DaysVolumeNaira.toLocaleString('en-NG')} in the last 30 days; minimum ₦${VOLUME_FLOOR_NAIRA.toLocaleString('en-NG')}).`,
    );
  }

  if (signals.growthRatio < 0.8) {
    return ineligibleResult(
      signals,
      score,
      `Sales declined versus the prior 30 days (ratio ${signals.growthRatio.toFixed(2)}). We need a stable or growing file.`,
    );
  }

  if (signals.refundRatePct >= 0.1) {
    return ineligibleResult(
      signals,
      score,
      `Refund rate is elevated at ${(signals.refundRatePct * 100).toFixed(1)}% — we need to see that settle first.`,
    );
  }

  if (signals.settlementReliabilityPct < 0.98) {
    return ineligibleResult(
      signals,
      score,
      `Settlement reliability is ${(signals.settlementReliabilityPct * 100).toFixed(1)}% — below our 98% minimum.`,
    );
  }

  if (score.lt(ELIGIBILITY_MIN_SCORE)) {
    return ineligibleResult(
      signals,
      score,
      `Score ${score.toFixed(2)} is below our ${ELIGIBILITY_MIN_SCORE} minimum — keep sales steady and reapply in a few weeks.`,
    );
  }

  const tier = tierFromScore(score);
  if (!tier) {
    return ineligibleResult(signals, score, 'Score below eligibility threshold.');
  }

  const offer = buildOfferTerms(signals, score, tier);

  if (offer.suggestedOfferNaira <= 0) {
    return ineligibleResult(
      signals,
      score,
      'Computed offer size is zero at current volume and score.',
      flags,
    );
  }

  return {
    score: score.toNumber(),
    eligible: true,
    tier,
    reason: `Eligible — ${tier} pricing (score ${score.toFixed(2)}).`,
    explanation: explainOffer(signals, score.toNumber(), offer),
    flags,
    maxOfferNaira: offer.maxOfferNaira,
    suggestedOfferNaira: offer.suggestedOfferNaira,
    feeNaira: offer.feeNaira,
    repaymentPercentage: offer.repaymentPercentage,
    expectedRepaymentDays: offer.expectedRepaymentDays,
    signals,
  };
}

export type { ComputedSignals, OfferTerms };
export {
  computeSignalsFromTransactions,
  fixtureDaysAgoToTransactions,
} from './signals';
export { compositeScore, scoreFromComputedSignals } from './score';
export {
  buildOfferTerms,
  computeExpectedRepaymentDays,
  computeRepaymentPercentage,
  priceFee,
  sizeOffer,
} from './pricing';
export { explainOffer, explainIneligibility } from './explainer';
export * from './constants';
