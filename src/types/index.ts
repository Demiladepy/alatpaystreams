export type BucketRuleKind = 'PERCENTAGE' | 'FIXED' | 'WEEKLY_FIXED';

export interface BucketRule {
  kind: BucketRuleKind;
  value: number;
  /** 0 = Sunday … 6 = Saturday; required when kind is WEEKLY_FIXED */
  dayOfWeek?: number;
}

export interface SplitBucket {
  id: string;
  rule: BucketRule;
  priority: number;
  isActive: boolean;
}

export interface SplitResult {
  bucketId: string | null;
  amountNaira: string;
}

export interface ApplySplitInput {
  merchantId: string;
  amountNaira: string | number;
  source?: 'CUSTOMER_PAYMENT' | 'MANUAL' | 'REFUND';
  externalRef?: string;
  raw?: Record<string, unknown>;
  now?: Date;
}

export interface ApplySplitOutput {
  transactionId: string;
  merchantId: string;
  amountNaira: string;
  splits: SplitResult[];
}

export interface CreateMerchantInput {
  name: string;
  phone: string;
  email: string;
  alatpayAccountId?: string;
}

export interface CreateBucketInput {
  merchantId: string;
  name: string;
  type:
    | 'TAX'
    | 'SAVINGS'
    | 'SUPPLIER'
    | 'OWNER_SALARY'
    | 'LOAN_REPAYMENT'
    | 'CUSTOM';
  rule: BucketRule;
  priority: number;
  isActive?: boolean;
}
