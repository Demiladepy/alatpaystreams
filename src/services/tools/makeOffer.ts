import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { expireStaleOffers } from '../loanUtils';

export interface MakeOfferInput {
  merchantId: string;
  amountNaira: number;
  feeNaira: number;
  repaymentPercentage: number;
}

export async function makeOffer(input: MakeOfferInput) {
  await expireStaleOffers(input.merchantId);

  const existingOffer = await prisma.loan.findFirst({
    where: { merchantId: input.merchantId, status: 'OFFERED' },
  });
  if (existingOffer) {
    return {
      offerId: existingOffer.id,
      summary: `An offer of ₦${existingOffer.principal.toString()} is already on the table (expires within the hour).`,
      alreadyOffered: true,
    };
  }

  const principal = new Decimal(input.amountNaira);
  const fee = new Decimal(input.feeNaira);
  const outstanding = principal.plus(fee);

  const loan = await prisma.loan.create({
    data: {
      merchantId: input.merchantId,
      principal: principal.toFixed(2),
      feeNaira: fee.toFixed(2),
      outstanding: outstanding.toFixed(2),
      repaymentPercentage: new Decimal(input.repaymentPercentage).toFixed(2),
      status: 'OFFERED',
    },
  });

  await prisma.ledgerEvent.create({
    data: {
      merchantId: input.merchantId,
      type: 'LOAN_OFFERED',
      payload: {
        loanId: loan.id,
        principal: principal.toFixed(2),
        feeNaira: fee.toFixed(2),
        repaymentPercentage: input.repaymentPercentage,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  const summary =
    `Working-capital offer: ₦${principal.toFixed(0)} principal, ` +
    `₦${fee.toFixed(0)} fee, repay ${input.repaymentPercentage}% of future sales. ` +
    `Offer ${loan.id} expires in 1 hour.`;

  return { offerId: loan.id, summary, alreadyOffered: false };
}

export const makeOfferDefinition = {
  name: 'make_offer',
  description:
    'Create a loan offer for the merchant. Only call after check_eligibility returns eligible=true.',
  input_schema: {
    type: 'object' as const,
    properties: {
      merchantId: { type: 'string' },
      amountNaira: { type: 'number', description: 'Principal amount in Naira' },
      feeNaira: { type: 'number', description: 'One-time fee in Naira' },
      repaymentPercentage: { type: 'number', description: 'Percentage of future sales' },
    },
    required: ['merchantId', 'amountNaira', 'feeNaira', 'repaymentPercentage'],
  },
};
