import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { alatpayService } from '../../integrations/alatpay';

export interface AcceptLoanInput {
  loanId: string;
}

export async function acceptLoan(input: AcceptLoanInput) {
  const loan = await prisma.loan.findUnique({ where: { id: input.loanId } });
  if (!loan) {
    throw new Error('Loan offer not found');
  }
  if (loan.status === 'EXPIRED') {
    throw new Error('This offer has expired. Run eligibility again for a fresh offer.');
  }
  if (loan.status !== 'OFFERED') {
    throw new Error(`Loan is already ${loan.status.toLowerCase()}`);
  }

  const merchant = await prisma.merchant.findUnique({ where: { id: loan.merchantId } });
  if (!merchant?.alatpayAccountId) {
    throw new Error('Merchant has no ALATPay account linked');
  }

  const maxPriority = await prisma.bucket.aggregate({
    where: { merchantId: loan.merchantId },
    _max: { priority: true },
  });
  const priority = (maxPriority._max.priority ?? 0) + 1;
  const repaymentPct = new Decimal(loan.repaymentPercentage.toString()).toNumber();

  const result = await prisma.$transaction(async (tx) => {
    const bucket = await tx.bucket.create({
      data: {
        merchantId: loan.merchantId,
        name: 'Loan Repayment',
        type: 'LOAN_REPAYMENT',
        rule: { kind: 'PERCENTAGE', value: repaymentPct },
        priority,
        isActive: true,
      },
    });

    await tx.loan.update({
      where: { id: loan.id },
      data: { status: 'ACTIVE', acceptedAt: new Date() },
    });

    await tx.ledgerEvent.create({
      data: {
        merchantId: loan.merchantId,
        type: 'LOAN_ACCEPTED',
        payload: {
          loanId: loan.id,
          bucketId: bucket.id,
          principal: loan.principal.toString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return bucket;
  });

  const payout = await alatpayService.payout({
    merchantAccountId: merchant.alatpayAccountId,
    amountNaira: new Decimal(loan.principal.toString()),
    narration: `ALATPay Streams loan disbursement ${loan.id}`,
    reference: `LOAN-${loan.id}`,
  });

  if (payout.status === 'failed') {
    throw new Error(
      payout.failureReason ??
        'Disbursement failed — we will retry shortly. Your loan bucket is already active.',
    );
  }

  return {
    disbursed: payout.status === 'successful' || payout.status === 'pending',
    transactionId: payout.transactionId,
    newBucketId: result.id,
    principal: loan.principal.toString(),
    payoutStatus: payout.status,
  };
}

export const acceptLoanDefinition = {
  name: 'accept_loan',
  description: 'Accept a loan offer, create repayment bucket, and disburse funds.',
  input_schema: {
    type: 'object' as const,
    properties: {
      loanId: { type: 'string', description: 'Offer ID from make_offer' },
    },
    required: ['loanId'],
  },
};
