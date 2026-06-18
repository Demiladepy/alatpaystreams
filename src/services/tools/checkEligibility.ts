import { prisma } from '../../lib/db';
import { alatpayService } from '../../integrations/alatpay';
import { expireStaleOffers } from '../loanUtils';
import { subDays } from '../dateUtils';
import { evaluateUnderwriting } from '../underwriting';
import { collectTransactionSignals } from '../transactionSignals';
import { OFFER_COOLDOWN_DAYS } from '../underwriting/constants';

export interface CheckEligibilityInput {
  merchantId: string;
}

export async function checkEligibility(input: CheckEligibilityInput) {
  await expireStaleOffers(input.merchantId);

  const merchant = await prisma.merchant.findUnique({
    where: { id: input.merchantId },
  });

  const activeLoan = await prisma.loan.findFirst({
    where: { merchantId: input.merchantId, status: 'ACTIVE' },
  });

  const cooldownStart = subDays(new Date(), OFFER_COOLDOWN_DAYS);
  const recentOffer = await prisma.loan.findFirst({
    where: {
      merchantId: input.merchantId,
      offeredAt: { gte: cooldownStart },
    },
  });

  let accountFrozen = false;
  if (merchant?.alatpayAccountId) {
    try {
      const account = await alatpayService.getAccount(merchant.alatpayAccountId);
      accountFrozen = account.status === 'frozen';
    } catch {
      accountFrozen = false;
    }
  }

  const collected = await collectTransactionSignals(input.merchantId);
  const result = evaluateUnderwriting(collected._computed, {
    hasActiveLoan: activeLoan !== null,
    accountFrozen,
    recentOfferWithin7Days: recentOffer !== null && activeLoan === null,
  });

  return {
    eligible: result.eligible,
    reason: result.reason,
    explanation: result.explanation,
    maxOfferNaira: result.maxOfferNaira,
    suggestedOfferNaira: result.suggestedOfferNaira,
    feeNaira: result.feeNaira,
    repaymentPercentage: result.repaymentPercentage,
    expectedRepaymentDays: result.expectedRepaymentDays,
    tier: result.tier,
    flags: result.flags,
    signals: {
      last30DaysVolume: collected.last30DaysVolume,
      growthRateVsPrior30: collected.growthRateVsPrior30,
      txCount: collected.txCount,
      customerConcentration: collected.customerConcentration,
      refundRate: collected.refundRate,
      tenureDays: collected.tenureDays,
      velocityCoV: collected.velocityCoV,
      settlementReliabilityPct: collected.settlementReliabilityPct,
    },
    score: result.score,
  };
}

export const checkEligibilityDefinition = {
  name: 'check_eligibility',
  description:
    'Check whether the merchant qualifies for a working-capital loan based on the last 90 days of sales. Always call this before making an offer.',
  input_schema: {
    type: 'object' as const,
    properties: {
      merchantId: { type: 'string', description: 'Merchant ID' },
    },
    required: ['merchantId'],
  },
};
