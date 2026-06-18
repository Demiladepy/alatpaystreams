import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { createBucket } from '../src/services/tools/createBucket';
import { checkEligibility } from '../src/services/tools/checkEligibility';
import { makeOffer } from '../src/services/tools/makeOffer';
import { acceptLoan } from '../src/services/tools/acceptLoan';
import { clearPendingConfirmations } from '../src/services/tools/confirmSupplierPayment';
import { resetEligibilityCache } from '../src/services/orchestrator';
import {
  computeSignalsFromTransactions,
  evaluateUnderwriting,
  fixtureDaysAgoToTransactions,
} from '../src/services/underwriting';

const prisma = new PrismaClient();
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    status: 'successful',
    transactionId: 'ALATPAY-test-tx',
    balanceAfter: 100000,
  }),
}) as jest.Mock;

async function createTestMerchant(suffix: string) {
  return prisma.merchant.create({
    data: {
      name: `Test Merchant ${suffix}`,
      phone: `+23480999${suffix.padStart(4, '0').slice(-4)}`,
      email: `test-${suffix}@example.ng`,
      alatpayAccountId: `alatpay_test_${suffix}`,
    },
  });
}

async function seedTransactions(
  merchantId: string,
  specs: Array<{ amount: number; daysAgo: number; source?: 'CUSTOMER_PAYMENT' | 'REFUND'; raw?: object }>,
) {
  for (const spec of specs) {
    const receivedAt = new Date();
    receivedAt.setDate(receivedAt.getDate() - spec.daysAgo);
    await prisma.transaction.create({
      data: {
        merchantId,
        amountNaira: new Decimal(spec.amount).toFixed(2),
        source: spec.source ?? 'CUSTOMER_PAYMENT',
        receivedAt,
        raw: spec.raw ?? undefined,
      },
    });
  }
}

async function cleanupMerchant(merchantId: string) {
  await prisma.message.deleteMany({ where: { conversation: { merchantId } } });
  await prisma.conversation.deleteMany({ where: { merchantId } });
  await prisma.ledgerEvent.deleteMany({ where: { merchantId } });
  await prisma.split.deleteMany({ where: { transaction: { merchantId } } });
  await prisma.transaction.deleteMany({ where: { merchantId } });
  await prisma.bucket.deleteMany({ where: { merchantId } });
  await prisma.loan.deleteMany({ where: { merchantId } });
  await prisma.merchant.delete({ where: { id: merchantId } });
}

describeIfDb('orchestrator tools integration', () => {
  afterEach(() => {
    clearPendingConfirmations();
    resetEligibilityCache();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a bucket and refuses when percentages exceed 100%', async () => {
    const merchant = await createTestMerchant('bucket');

    await createBucket({
      merchantId: merchant.id,
      name: 'VAT',
      type: 'TAX',
      rule: { kind: 'PERCENTAGE', value: 60 },
    });

    const refused = await createBucket({
      merchantId: merchant.id,
      name: 'Savings',
      type: 'SAVINGS',
      rule: { kind: 'PERCENTAGE', value: 50 },
    });

    expect(refused.success).toBe(false);
    expect(refused.error).toMatch(/exceeds 100%/);

    const allowed = await createBucket({
      merchantId: merchant.id,
      name: 'Savings',
      type: 'SAVINGS',
      rule: { kind: 'PERCENTAGE', value: 30 },
    });

    expect(allowed.success).toBe(true);

    await cleanupMerchant(merchant.id);
  });

  it('refuses eligibility on a thin transaction file', async () => {
    const merchant = await createTestMerchant('thin');

    await seedTransactions(
      merchant.id,
      Array.from({ length: 5 }, (_, i) => ({
        amount: 5000,
        daysAgo: i,
      })),
    );

    const result = await checkEligibility({ merchantId: merchant.id });

    expect(result.eligible).toBe(false);
    expect(result.signals.last30DaysVolume).toBeLessThan(200_000);

    await cleanupMerchant(merchant.id);
  });

  it('approves eligibility on a strong transaction file', async () => {
    const merchant = await createTestMerchant('strong');

    const priorTxs = Array.from({ length: 40 }, (_, i) => ({
      amount: 12000,
      daysAgo: 35 + (i % 25),
      raw: { customerName: `Customer ${i % 10}` },
    }));

    const recentTxs = Array.from({ length: 50 }, (_, i) => ({
      amount: 15000,
      daysAgo: i % 28,
      raw: { customerName: `Customer ${i % 12}` },
    }));

    await seedTransactions(merchant.id, [...priorTxs, ...recentTxs]);

    const result = await checkEligibility({ merchantId: merchant.id });

    expect(result.eligible).toBe(true);
    expect(result.suggestedOfferNaira).toBeGreaterThan(0);
    expect(result.signals.growthRateVsPrior30).toBeGreaterThan(0);

    await cleanupMerchant(merchant.id);
  });

  it('runs loan offer and acceptance flow', async () => {
    const merchant = await createTestMerchant('loan');

    await seedTransactions(
      merchant.id,
      Array.from({ length: 60 }, (_, i) => ({
        amount: 18000,
        daysAgo: i % 45,
        raw: { customerName: `Buyer ${i % 8}` },
      })),
    );

    const eligibility = await checkEligibility({ merchantId: merchant.id });
    expect(eligibility.eligible).toBe(true);

    const offer = await makeOffer({
      merchantId: merchant.id,
      amountNaira: eligibility.suggestedOfferNaira,
      feeNaira: eligibility.feeNaira,
      repaymentPercentage: eligibility.repaymentPercentage,
    });

    expect(offer.offerId).toBeDefined();

    const accepted = await acceptLoan({ loanId: offer.offerId });

    expect(accepted.disbursed).toBe(true);
    expect(accepted.newBucketId).toBeDefined();

    const bucket = await prisma.bucket.findUnique({ where: { id: accepted.newBucketId } });
    expect(bucket?.type).toBe('LOAN_REPAYMENT');

    const loan = await prisma.loan.findUnique({ where: { id: offer.offerId } });
    expect(loan?.status).toBe('ACTIVE');

    await cleanupMerchant(merchant.id);
  });

  it('penalises high refund rate in underwriting', async () => {
    const signals = computeSignalsFromTransactions(
      [
        {
          amountNaira: 400_000,
          receivedAt: new Date(),
          source: 'CUSTOMER_PAYMENT',
        },
        {
          amountNaira: 50_000,
          receivedAt: new Date(),
          source: 'REFUND',
        },
      ],
      new Date(),
    );

    const result = evaluateUnderwriting(signals, {
      hasActiveLoan: false,
      accountFrozen: false,
      recentOfferWithin7Days: false,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/Refund rate/i);
  });
});

describe('underwriting unit', () => {
  it('scores healthy files above threshold', () => {
    const referenceDate = new Date('2025-06-18T12:00:00.000Z');
    const txs = [
      ...Array.from({ length: 40 }, (_, i) => ({
        amountNaira: 12_000,
        daysAgo: 35 + (i % 25),
        raw: { customerName: `Customer ${i % 10}` },
      })),
      ...Array.from({ length: 50 }, (_, i) => ({
        amountNaira: 15_000,
        daysAgo: i % 28,
        raw: { customerName: `Customer ${i % 12}` },
      })),
    ];

    const signals = computeSignalsFromTransactions(
      fixtureDaysAgoToTransactions(txs, referenceDate),
      referenceDate,
    );

    const result = evaluateUnderwriting(signals, {
      hasActiveLoan: false,
      accountFrozen: false,
      recentOfferWithin7Days: false,
    });

    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.45);
  });
});
