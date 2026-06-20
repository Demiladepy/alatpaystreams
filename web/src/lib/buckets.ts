import type { BucketType } from "@/types";
import {
  CreditCard,
  PiggyBank,
  Receipt,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const bucketTypeConfig: Record<
  BucketType,
  { icon: LucideIcon; accent: string; label: string }
> = {
  TAX: { icon: Receipt, accent: "#635BFF", label: "Tax" },
  SAVINGS: { icon: PiggyBank, accent: "#635BFF", label: "Savings" },
  SUPPLIER: { icon: Truck, accent: "#635BFF", label: "Supplier" },
  OWNER_SALARY: { icon: User, accent: "#635BFF", label: "Salary" },
  LOAN_REPAYMENT: { icon: CreditCard, accent: "#635BFF", label: "Loan" },
  CUSTOM: { icon: Wallet, accent: "#635BFF", label: "Custom" },
};

export function getBucketConfig(type: BucketType) {
  return bucketTypeConfig[type] ?? bucketTypeConfig.CUSTOM;
}
