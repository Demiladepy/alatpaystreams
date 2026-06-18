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
  TAX: { icon: Receipt, accent: "#D4A24C", label: "Tax" },
  SAVINGS: { icon: PiggyBank, accent: "#2D6A4F", label: "Savings" },
  SUPPLIER: { icon: Truck, accent: "#40916C", label: "Supplier" },
  OWNER_SALARY: { icon: User, accent: "#0F3D2E", label: "Salary" },
  LOAN_REPAYMENT: { icon: CreditCard, accent: "#B5443A", label: "Loan" },
  CUSTOM: { icon: Wallet, accent: "#5A7A6E", label: "Custom" },
};

export function getBucketConfig(type: BucketType) {
  return bucketTypeConfig[type] ?? bucketTypeConfig.CUSTOM;
}
