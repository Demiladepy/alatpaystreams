import {
  acceptLoan,
  acceptLoanDefinition,
} from './acceptLoan';
import {
  checkEligibility,
  checkEligibilityDefinition,
} from './checkEligibility';
import {
  confirmSupplierPayment,
  confirmSupplierPaymentDefinition,
} from './confirmSupplierPayment';
import {
  createBucket,
  createBucketDefinition,
} from './createBucket';
import {
  makeOffer,
  makeOfferDefinition,
} from './makeOffer';
import {
  nudgeTaxDeadline,
  nudgeTaxDeadlineDefinition,
} from './nudgeTaxDeadline';
import {
  summarizeBuckets,
  summarizeBucketsDefinition,
} from './summarizeBuckets';

export const toolDefinitions = [
  checkEligibilityDefinition,
  makeOfferDefinition,
  acceptLoanDefinition,
  summarizeBucketsDefinition,
  createBucketDefinition,
  nudgeTaxDeadlineDefinition,
  confirmSupplierPaymentDefinition,
];

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>;

export const toolExecutors: Record<string, ToolExecutor> = {
  check_eligibility: (input) =>
    checkEligibility({ merchantId: String(input.merchantId) }),
  make_offer: (input) =>
    makeOffer({
      merchantId: String(input.merchantId),
      amountNaira: Number(input.amountNaira),
      feeNaira: Number(input.feeNaira),
      repaymentPercentage: Number(input.repaymentPercentage),
    }),
  accept_loan: (input) => acceptLoan({ loanId: String(input.loanId) }),
  summarize_buckets: (input) =>
    summarizeBuckets({ merchantId: String(input.merchantId) }),
  create_bucket: (input) =>
    createBucket({
      merchantId: String(input.merchantId),
      name: String(input.name),
      type: input.type as 'TAX' | 'SAVINGS' | 'SUPPLIER' | 'OWNER_SALARY' | 'LOAN_REPAYMENT' | 'CUSTOM',
      rule: input.rule as { kind: 'PERCENTAGE' | 'FIXED' | 'WEEKLY_FIXED'; value: number; dayOfWeek?: number },
    }),
  nudge_tax_deadline: (input) =>
    nudgeTaxDeadline({ merchantId: String(input.merchantId) }),
  confirm_supplier_payment: (input) =>
    confirmSupplierPayment({
      merchantId: String(input.merchantId),
      supplierName: String(input.supplierName ?? ''),
      amountNaira: Number(input.amountNaira ?? 0),
      confirmationId: input.confirmationId ? String(input.confirmationId) : undefined,
      confirm: Boolean(input.confirm),
    }),
};
