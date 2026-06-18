import Decimal from 'decimal.js';
import { SIGNAL_WEIGHTS } from './constants';
import type { ComputedSignals, SignalScores } from './signals';

export function compositeScore(signals: SignalScores): Decimal {
  const weighted =
    signals.volume * SIGNAL_WEIGHTS.volume +
    signals.growth * SIGNAL_WEIGHTS.growth +
    signals.velocityConsistency * SIGNAL_WEIGHTS.velocityConsistency +
    signals.customerConcentration * SIGNAL_WEIGHTS.customerConcentration +
    signals.refundRate * SIGNAL_WEIGHTS.refundRate +
    signals.tenure * SIGNAL_WEIGHTS.tenure +
    signals.settlementReliability * SIGNAL_WEIGHTS.settlementReliability;

  return new Decimal(weighted).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}

export function scoreFromComputedSignals(signals: ComputedSignals): Decimal {
  return compositeScore({
    volume: signals.volume,
    growth: signals.growth,
    velocityConsistency: signals.velocityConsistency,
    customerConcentration: signals.customerConcentration,
    refundRate: signals.refundRate,
    tenure: signals.tenure,
    settlementReliability: signals.settlementReliability,
  });
}
