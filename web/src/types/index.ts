export type BucketType =
  | "TAX"
  | "SAVINGS"
  | "SUPPLIER"
  | "OWNER_SALARY"
  | "LOAN_REPAYMENT"
  | "CUSTOM";

export type BucketRuleKind = "PERCENTAGE" | "FIXED" | "WEEKLY_FIXED";

export interface BucketRule {
  kind: BucketRuleKind;
  value: number;
  dayOfWeek?: number;
}

export interface Bucket {
  id: string;
  merchantId: string;
  name: string;
  type: BucketType;
  rule: BucketRule;
  priority: number;
  balance: string;
  isActive: boolean;
  createdAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  phone: string;
  email: string;
  alatpayAccountId: string | null;
}

export interface Split {
  id: string;
  transactionId: string;
  bucketId: string | null;
  amountNaira: string;
  createdAt: string;
  bucket?: Bucket | null;
}

export interface Transaction {
  id: string;
  merchantId: string;
  amountNaira: string;
  source: "CUSTOMER_PAYMENT" | "MANUAL" | "REFUND";
  externalRef: string | null;
  receivedAt: string;
  splits: Split[];
}

export interface SplitResult {
  bucketId: string | null;
  amountNaira: string;
}

export interface SimulateResponse {
  transactionId: string;
  merchantId: string;
  amountNaira: string;
  splits: SplitResult[];
}

export interface BucketWithActivity extends Bucket {
  recentActivity: number[];
}
