import fs from 'fs';
import path from 'path';
import {
  evaluateUnderwriting,
  computeSignalsFromTransactions,
  fixtureDaysAgoToTransactions,
} from '../src/services/underwriting';
import { TIER_STANDARD_MIN } from '../src/services/underwriting/constants';

interface FixtureFile {
  name: string;
  referenceDate: string;
  context: {
    hasActiveLoan: boolean;
    accountFrozen: boolean;
    recentOfferWithin7Days: boolean;
  };
  transactions: Array<{
    amountNaira: number;
    daysAgo: number;
    source?: 'CUSTOMER_PAYMENT' | 'REFUND';
    raw?: unknown;
    settlementStatus?: 'settled' | 'failed' | 'retry';
  }>;
  expected: {
    eligible: boolean;
    tier?: string | null;
    scoreMin?: number;
    scoreMax?: number;
    last30VolumeMin?: number;
    last30VolumeMax?: number;
    suggestedOfferMin?: number;
    topCustomerShareMin?: number;
    growthRatioMin?: number;
    growthRatioMax?: number;
    flagsInclude?: string;
    reasonIncludes?: string;
  };
}

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'underwriting');

function loadFixture(name: string): FixtureFile {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, `${name}.json`), 'utf8'),
  ) as FixtureFile;
}

function runFixture(name: string) {
  const fixture = loadFixture(name);
  const referenceDate = new Date(fixture.referenceDate);
  const inputs = fixtureDaysAgoToTransactions(fixture.transactions, referenceDate);
  const signals = computeSignalsFromTransactions(inputs, referenceDate);
  const result = evaluateUnderwriting(signals, fixture.context);
  return { fixture, signals, result };
}

describe('underwriting fixture scenarios', () => {
  it('thin file → conservative eligible offer', () => {
    const { signals, result, fixture } = runFixture('thin-file');

    expect(result.eligible).toBe(fixture.expected.eligible);
    expect(['conservative', 'standard']).toContain(result.tier);
    expect(result.score).toBeGreaterThanOrEqual(fixture.expected.scoreMin!);
    expect(result.score).toBeLessThan(TIER_STANDARD_MIN + 0.05);
    expect(signals.last30DaysVolumeNaira).toBeGreaterThanOrEqual(
      fixture.expected.last30VolumeMin!,
    );
    expect(signals.last30DaysVolumeNaira).toBeLessThanOrEqual(
      fixture.expected.last30VolumeMax!,
    );
    expect(result.suggestedOfferNaira).toBeGreaterThanOrEqual(
      fixture.expected.suggestedOfferMin!,
    );
    expect(result.explanation).toMatch(/₦/);
  });

  it('strong file → preferred eligible offer', () => {
    const { signals, result, fixture } = runFixture('strong-file');

    expect(result.eligible).toBe(true);
    expect(result.tier).toBe('preferred');
    expect(result.score).toBeGreaterThanOrEqual(fixture.expected.scoreMin!);
    expect(signals.last30DaysVolumeNaira).toBeGreaterThanOrEqual(
      fixture.expected.last30VolumeMin!,
    );
    expect(result.suggestedOfferNaira).toBeGreaterThanOrEqual(
      fixture.expected.suggestedOfferMin!,
    );
  });

  it('concentrated customer → ineligible', () => {
    const { signals, result, fixture } = runFixture('concentrated');

    expect(result.eligible).toBe(false);
    expect(signals.topCustomerShare).toBeGreaterThanOrEqual(
      fixture.expected.topCustomerShareMin!,
    );
    expect(result.reason).toMatch(/customer/i);
  });

  it('declining sales → ineligible', () => {
    const { signals, result, fixture } = runFixture('declining');

    expect(result.eligible).toBe(false);
    expect(signals.growthRatio).toBeLessThanOrEqual(fixture.expected.growthRatioMax!);
    expect(result.reason).toMatch(/declined/i);
  });

  it('suspicious spike → flagged, no offer', () => {
    const { signals, result, fixture } = runFixture('suspicious-spike');

    expect(result.eligible).toBe(false);
    expect(signals.growthRatio).toBeGreaterThanOrEqual(fixture.expected.growthRatioMin!);
    expect(result.flags).toContain(fixture.expected.flagsInclude);
    expect(result.reason).toMatch(/manual review/i);
  });

  it('active loan → no new offer', () => {
    const { result, fixture } = runFixture('active-loan');

    expect(result.eligible).toBe(false);
    expect(result.reason.toLowerCase()).toContain(fixture.expected.reasonIncludes!);
  });
});

describe('underwriting structuring detection', () => {
  it('blocks when more than 30 same-amount txs occur in one day', () => {
    const referenceDate = new Date('2025-06-18T12:00:00.000Z');
    const txs = Array.from({ length: 31 }, (_, i) => ({
      amountNaira: 5_000,
      receivedAt: new Date(referenceDate.getTime() - 2 * 60 * 60 * 1000 - i * 1000),
      source: 'CUSTOMER_PAYMENT' as const,
    }));

    const signals = computeSignalsFromTransactions(txs, referenceDate);
    expect(signals.structuringFlag).toBe(true);

    const result = evaluateUnderwriting(signals, {
      hasActiveLoan: false,
      accountFrozen: false,
      recentOfferWithin7Days: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.flags).toContain('STRUCTURING_SUSPECTED');
  });
});
