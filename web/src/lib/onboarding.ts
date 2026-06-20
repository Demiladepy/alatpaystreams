import type { BucketType } from "@/types";

export interface BucketOption {
  type: BucketType;
  label: string;
  labelLocal: string;
  description: string;
}

export const BUCKET_OPTIONS: BucketOption[] = [
  {
    type: "TAX",
    label: "Tax & VAT",
    labelLocal: "Owo-ori / VAT",
    description: "Set aside for FIRS, state levies, and VAT filings.",
  },
  {
    type: "SAVINGS",
    label: "Savings",
    labelLocal: "Akojo",
    description: "Emergency fund and business reserves.",
  },
  {
    type: "SUPPLIER",
    label: "Supplier",
    labelLocal: "Oja / Stock",
    description: "Pay vendors and restock inventory on schedule.",
  },
  {
    type: "OWNER_SALARY",
    label: "Owner salary",
    labelLocal: "Owo olohun",
    description: "Your personal draw from the business.",
  },
  {
    type: "LOAN_REPAYMENT",
    label: "Loan repayment",
    labelLocal: "Sanwo gbese",
    description: "Auto-repay working-capital from every sale.",
  },
  {
    type: "CUSTOM",
    label: "Custom",
    labelLocal: "Miiran",
    description: "Any other pot — rent, staff, equipment.",
  },
];

export interface OnboardingBucket {
  type: BucketType;
  name: string;
  percentage: number;
  naturalLanguage: string;
}

export function defaultBucketName(type: BucketType): string {
  return BUCKET_OPTIONS.find((b) => b.type === type)?.label ?? "Custom bucket";
}

/** Lightweight parse until YarnGPT / voice LLM is wired */
export function parseRuleFromText(text: string): number | null {
  const pct = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
  if (pct) return Math.min(100, parseFloat(pct[1]));

  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    fifteen: 15,
    twenty: 20,
    thirty: 30,
    fifty: 50,
  };
  const wordPct = text.match(
    /(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|fifty)\s*(?:and\s+a\s+half|point\s+five)?\s*(?:%|percent)/i,
  );
  if (wordPct) {
    let n = words[wordPct[1].toLowerCase()] ?? 0;
    if (/half|point\s+five/i.test(text)) n += 0.5;
    return n;
  }

  return null;
}
