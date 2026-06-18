import { prisma } from '../../lib/db';
import { daysUntilNextVatFiling, formatNaira } from '../dateUtils';

export interface NudgeTaxDeadlineInput {
  merchantId: string;
}

export async function nudgeTaxDeadline(input: NudgeTaxDeadlineInput) {
  const taxBucket = await prisma.bucket.findFirst({
    where: { merchantId: input.merchantId, type: 'TAX', isActive: true },
  });

  const daysUntilVAT = daysUntilNextVatFiling();
  const taxBucketBalance = taxBucket
    ? parseFloat(taxBucket.balance.toString())
    : 0;

  const suggestedRemittance = taxBucketBalance > 0 ? taxBucketBalance : null;

  return {
    daysUntilVAT,
    taxBucketBalance,
    taxBucketName: taxBucket?.name ?? null,
    suggestedRemittance,
    message:
      taxBucketBalance > 0
        ? `VAT filing is in ${daysUntilVAT} days. Your tax bucket has ${formatNaira(taxBucketBalance)} set aside.`
        : `VAT filing is in ${daysUntilVAT} days, but your tax bucket is empty — consider routing VAT now.`,
  };
}

export const nudgeTaxDeadlineDefinition = {
  name: 'nudge_tax_deadline',
  description:
    'Get VAT deadline info and tax bucket balance. Only use when a tax nudge is already queued.',
  input_schema: {
    type: 'object' as const,
    properties: {
      merchantId: { type: 'string' },
    },
    required: ['merchantId'],
  },
};
