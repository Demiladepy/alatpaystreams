import Decimal from 'decimal.js';
import {
  scoreConcentrationSignal,
  scoreGrowthSignal,
  scoreRefundSignal,
  scoreSettlementSignal,
  scoreTenureSignal,
  scoreVelocitySignal,
  scoreVolumeSignal,
  computeSignalsFromTransactions,
} from '../src/services/underwriting/signals';
import { compositeScore } from '../src/services/underwriting/score';
import {
  buildOfferTerms,
  computeExpectedRepaymentDays,
  computeRepaymentPercentage,
  priceFee,
  sizeOffer,
} from '../src/services/underwriting/pricing';
import { explainOffer } from '../src/services/underwriting/explainer';
import { ELIGIBILITY_MIN_SCORE } from '../src/services/underwriting/constants';

describe('underwriting signal calculators', () => {
  it('scores volume log-linearly from ₦200k to ₦5M', () => {
    expect(scoreVolumeSignal(100_000)).toBe(0);
    expect(scoreVolumeSignal(200_000)).toBe(0);
    expect(scoreVolumeSignal(5_000_000)).toBe(1);
    const mid = scoreVolumeSignal(1_000_000);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.7);
  });

  it('scores growth ratio bands including suspicious spike', () => {
    expect(scoreGrowthSignal(0.6).score).toBe(0);
    expect(scoreGrowthSignal(0.9).score).toBe(0.4);
    expect(scoreGrowthSignal(1.15).score).toBe(0.8);
    expect(scoreGrowthSignal(1.5).score).toBe(1);
    const spike = scoreGrowthSignal(3.5);
    expect(spike.score).toBe(0.6);
    expect(spike.suspiciousGrowthSpike).toBe(true);
  });

  it('scores velocity CoV linearly', () => {
    expect(scoreVelocitySignal(0.2)).toBe(1);
    expect(scoreVelocitySignal(1.5)).toBe(0);
    expect(scoreVelocitySignal(0.8)).toBeCloseTo(0.5, 1);
  });

  it('scores customer concentration tiers', () => {
    expect(scoreConcentrationSignal(0.15)).toBe(1);
    expect(scoreConcentrationSignal(0.25)).toBe(0.6);
    expect(scoreConcentrationSignal(0.45)).toBe(0.3);
    expect(scoreConcentrationSignal(0.7)).toBe(0);
  });

  it('scores refund rate tiers', () => {
    expect(scoreRefundSignal(0.01)).toBe(1);
    expect(scoreRefundSignal(0.03)).toBe(0.7);
    expect(scoreRefundSignal(0.07)).toBe(0.3);
    expect(scoreRefundSignal(0.12)).toBe(0);
  });

  it('scores tenure bands', () => {
    expect(scoreTenureSignal(10)).toBe(0.2);
    expect(scoreTenureSignal(45)).toBe(0.5);
    expect(scoreTenureSignal(75)).toBe(0.8);
    expect(scoreTenureSignal(120)).toBe(1);
  });

  it('scores settlement reliability at 98% threshold', () => {
    expect(scoreSettlementSignal(0.99)).toBe(1);
    expect(scoreSettlementSignal(0.97)).toBe(0);
  });
});

describe('underwriting composite score', () => {
  it('weights signals to a 0–1 composite', () => {
    const perfect = compositeScore({
      volume: 1,
      growth: 1,
      velocityConsistency: 1,
      customerConcentration: 1,
      refundRate: 1,
      tenure: 1,
      settlementReliability: 1,
    });
    expect(perfect.toNumber()).toBe(1);

    const weak = compositeScore({
      volume: 0,
      growth: 0,
      velocityConsistency: 0,
      customerConcentration: 0,
      refundRate: 0,
      tenure: 0,
      settlementReliability: 0,
    });
    expect(weak.toNumber()).toBe(0);
  });
});

describe('underwriting pricing', () => {
  it('sizes offer with volume, score, and hard caps', () => {
    const score = new Decimal('0.75');
    const sized = sizeOffer(1_400_000, score);
    expect(sized.maxOfferNaira).toBe(420_000);
    expect(sized.suggestedOfferNaira).toBe(294_000);
  });

  it('prices fee with tier and add-ons, rounded up to ₦500', () => {
    const signals = computeSignalsFromTransactions([], new Date());
    const fee = priceFee(400_000, 'standard', {
      ...signals,
      tenureDays: 75,
      growth: 0.8,
    });
    expect(fee).toBe(16_000);
  });

  it('adds tenure and weak-growth fee add-ons', () => {
    const signals = computeSignalsFromTransactions([], new Date());
    const base = priceFee(400_000, 'standard', {
      ...signals,
      tenureDays: 45,
      growth: 0.4,
    });
    expect(base).toBe(20_000);
  });

  it('caps repayment percentage at 20%', () => {
    const pct = computeRepaymentPercentage(400_000, 16_000, 200_000);
    expect(pct).toBe(20);
  });

  it('computes expected repayment days from sales pace', () => {
    const days = computeExpectedRepaymentDays(400_000, 16_000, 1_400_000, 12);
    expect(days).toBeGreaterThan(15);
    expect(days).toBeLessThan(90);
  });

  it('builds full offer terms for standard tier', () => {
    const signals = {
      volume: 0.7,
      growth: 0.8,
      velocityConsistency: 0.9,
      customerConcentration: 1,
      refundRate: 1,
      tenure: 0.8,
      settlementReliability: 1,
      last30DaysVolumeNaira: 1_400_000,
      prior30DaysVolumeNaira: 1_150_000,
      growthRatio: 1.22,
      velocityCoV: 0.3,
      topCustomerShare: 0.18,
      refundRatePct: 0.012,
      tenureDays: 75,
      settlementReliabilityPct: 0.995,
      structuringFlag: false,
      suspiciousGrowthSpike: false,
    };

    const score = new Decimal('0.72');
    const offer = buildOfferTerms(signals, score, 'standard');
    expect(offer.suggestedOfferNaira).toBeGreaterThan(0);
    expect(offer.feeNaira % 500).toBe(0);
    expect(offer.repaymentPercentage).toBeLessThanOrEqual(20);

    const explanation = explainOffer(signals, score.toNumber(), offer);
    expect(explanation).toMatch(/₦/);
    expect(explanation).toMatch(/22%|up 22%/);
  });
});

describe('underwriting eligibility threshold', () => {
  it('uses 0.45 minimum composite score', () => {
    expect(ELIGIBILITY_MIN_SCORE).toBe(0.45);
  });
});
