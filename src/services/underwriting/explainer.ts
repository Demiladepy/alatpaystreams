import { formatNaira } from '../dateUtils';
import type { OfferTerms } from './pricing';
import type { ComputedSignals } from './signals';

function formatPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatGrowthRatio(ratio: number): string {
  if (ratio >= 1) {
    return `up ${((ratio - 1) * 100).toFixed(0)}% from prior`;
  }
  return `down ${((1 - ratio) * 100).toFixed(0)}% from prior`;
}

export function explainOffer(
  signals: ComputedSignals,
  score: number,
  offer: Pick<
    OfferTerms,
    | 'suggestedOfferNaira'
    | 'feeNaira'
    | 'repaymentPercentage'
    | 'expectedRepaymentDays'
    | 'tier'
  >,
): string {
  const growthPhrase = formatGrowthRatio(signals.growthRatio);
  const covPhrase =
    signals.velocityCoV <= 0.4
      ? 'very steady daily sales'
      : signals.velocityCoV <= 0.8
        ? 'steady daily sales'
        : 'uneven daily sales';

  return (
    `Your ALATPay volume hit ${formatNaira(signals.last30DaysVolumeNaira)} last month, ${growthPhrase}. ` +
    `${covPhrase.charAt(0).toUpperCase()}${covPhrase.slice(1)} (CoV ${signals.velocityCoV.toFixed(1)}), ` +
    `refund rate ${formatPct(signals.refundRatePct)}, top customer at ${formatPct(signals.topCustomerShare, 0)} share. ` +
    `Underwriting score ${score.toFixed(2)} (${offer.tier} tier) qualifies you for ${formatNaira(offer.suggestedOfferNaira)} at ${formatNaira(offer.feeNaira)} fee — ` +
    `likely repaid in ~${offer.expectedRepaymentDays} days at ${offer.repaymentPercentage}% per sale.`
  );
}

export function explainIneligibility(
  signals: ComputedSignals,
  score: number,
  reason: string,
): string {
  return (
    `Underwriting score ${score.toFixed(2)} — not eligible. ${reason} ` +
    `(Last 30d volume ${formatNaira(signals.last30DaysVolumeNaira)}, growth ratio ${signals.growthRatio.toFixed(2)}, ` +
    `top customer ${formatPct(signals.topCustomerShare, 0)}, refunds ${formatPct(signals.refundRatePct)}).`
  );
}
