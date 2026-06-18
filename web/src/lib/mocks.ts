import type { Bucket, BucketWithActivity, Merchant, Split, Transaction } from "@/types";

export const MOCK_MERCHANT_ID = "mock_merchant_funke";

export const mockMerchant: Merchant = {
  id: MOCK_MERCHANT_ID,
  name: "Funke Adebayo",
  phone: "+2348012345678",
  email: "funke@adebayokitchen.ng",
  alatpayAccountId: "ALAT-4829-7731",
};

function sparkline(seed: number): number[] {
  const base = 2000 + seed * 400;
  return Array.from({ length: 7 }, (_, i) =>
    Math.round(base + Math.sin(i + seed) * 1200 + i * 150),
  );
}

export const mockBuckets: Bucket[] = [
  {
    id: "bucket_tax",
    merchantId: MOCK_MERCHANT_ID,
    name: "VAT Reserve",
    type: "TAX",
    rule: { kind: "PERCENTAGE", value: 7.5 },
    priority: 1,
    balance: "42850.00",
    isActive: true,
    createdAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "bucket_savings",
    merchantId: MOCK_MERCHANT_ID,
    name: "Emergency Fund",
    type: "SAVINGS",
    rule: { kind: "PERCENTAGE", value: 10 },
    priority: 2,
    balance: "125000.00",
    isActive: true,
    createdAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "bucket_supplier",
    merchantId: MOCK_MERCHANT_ID,
    name: "Supplier — Mama Nkechi",
    type: "SUPPLIER",
    rule: { kind: "FIXED", value: 80000 },
    priority: 3,
    balance: "240000.00",
    isActive: true,
    createdAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "bucket_salary",
    merchantId: MOCK_MERCHANT_ID,
    name: "Owner Salary",
    type: "OWNER_SALARY",
    rule: { kind: "PERCENTAGE", value: 35 },
    priority: 4,
    balance: "875000.00",
    isActive: true,
    createdAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "bucket_loan",
    merchantId: MOCK_MERCHANT_ID,
    name: "Loan Repayment",
    type: "LOAN_REPAYMENT",
    rule: { kind: "PERCENTAGE", value: 5 },
    priority: 5,
    balance: "62000.00",
    isActive: true,
    createdAt: "2025-02-01T10:00:00Z",
  },
];

const bucketNameMap = Object.fromEntries(
  mockBuckets.map((b) => [b.id, b]),
);

function makeTransaction(
  index: number,
  amount: number,
  daysAgo: number,
): Transaction {
  const id = `tx_mock_${index}`;
  const receivedAt = new Date();
  receivedAt.setDate(receivedAt.getDate() - daysAgo);
  receivedAt.setHours(9 + (index % 8), (index * 7) % 60);

  const splits: Split[] = [
    { bucketId: "bucket_tax", pct: 0.075 },
    { bucketId: "bucket_savings", pct: 0.1 },
    { bucketId: "bucket_supplier", pct: 0.2 },
    { bucketId: "bucket_salary", pct: 0.35 },
    { bucketId: "bucket_loan", pct: 0.05 },
  ].map((s, i) => ({
    id: `split_${id}_${i}`,
    transactionId: id,
    bucketId: s.bucketId,
    amountNaira: (amount * s.pct).toFixed(2),
    createdAt: receivedAt.toISOString(),
    bucket: bucketNameMap[s.bucketId],
  }));

  const splitTotal = splits.reduce((a, s) => a + parseFloat(s.amountNaira), 0);
  const operating = amount - splitTotal;

  if (operating > 0.01) {
    splits.push({
      id: `split_${id}_op`,
      transactionId: id,
      bucketId: null,
      amountNaira: operating.toFixed(2),
      createdAt: receivedAt.toISOString(),
      bucket: null,
    });
  }

  return {
    id,
    merchantId: MOCK_MERCHANT_ID,
    amountNaira: amount.toFixed(2),
    source: index % 5 === 0 ? "MANUAL" : "CUSTOMER_PAYMENT",
    externalRef: index % 3 === 0 ? `ALAT-TX-${9000 + index}` : null,
    receivedAt: receivedAt.toISOString(),
    splits,
  };
}

export const mockTransactions: Transaction[] = [
  makeTransaction(1, 45000, 0),
  makeTransaction(2, 28500, 0),
  makeTransaction(3, 120000, 1),
  makeTransaction(4, 67500, 1),
  makeTransaction(5, 95000, 2),
  makeTransaction(6, 52000, 2),
  makeTransaction(7, 180000, 3),
  makeTransaction(8, 41000, 3),
  makeTransaction(9, 88000, 4),
  makeTransaction(10, 33000, 4),
  makeTransaction(11, 156000, 5),
  makeTransaction(12, 72000, 5),
  makeTransaction(13, 49000, 6),
  makeTransaction(14, 210000, 6),
  makeTransaction(15, 58000, 7),
  makeTransaction(16, 92000, 7),
  makeTransaction(17, 37500, 8),
  makeTransaction(18, 145000, 8),
  makeTransaction(19, 63000, 9),
  makeTransaction(20, 87000, 9),
  makeTransaction(21, 55000, 10),
  makeTransaction(22, 198000, 10),
  makeTransaction(23, 44000, 11),
  makeTransaction(24, 76000, 11),
  makeTransaction(25, 112000, 12),
  makeTransaction(26, 39000, 12),
  makeTransaction(27, 168000, 13),
  makeTransaction(28, 51000, 13),
  makeTransaction(29, 94000, 14),
  makeTransaction(30, 62000, 14),
];

export function getMockBucketsWithActivity(): BucketWithActivity[] {
  return mockBuckets.map((bucket, i) => ({
    ...bucket,
    recentActivity: sparkline(i + 1),
  }));
}

export function simulateMockTransaction(amountNaira: number) {
  const tx = makeTransaction(
    mockTransactions.length + 1,
    amountNaira,
    0,
  );

  mockTransactions.unshift(tx);

  for (const split of tx.splits) {
    if (split.bucketId) {
      const bucket = mockBuckets.find((b) => b.id === split.bucketId);
      if (bucket) {
        bucket.balance = (
          parseFloat(bucket.balance) + parseFloat(split.amountNaira)
        ).toFixed(2);
      }
    }
  }

  const channels = ["card", "transfer", "ussd"] as const;
  const channel = channels[Math.floor(Math.random() * channels.length)];
  const customerNames = [
    "Adaeze Okafor",
    "Chidi Nwosu",
    "Fatima Bello",
    "Emeka Okonkwo",
    "Blessing Ogunleye",
  ];
  const customerName =
    customerNames[Math.floor(Math.random() * customerNames.length)];

  return {
    transactionId: tx.id,
    merchantId: MOCK_MERCHANT_ID,
    amountNaira: tx.amountNaira,
    splits: tx.splits.map((s) => ({
      bucketId: s.bucketId,
      amountNaira: s.amountNaira,
    })),
    streamPayload: {
      transactionId: tx.id,
      amountNaira: tx.amountNaira,
      customerName,
      channel,
      receivedAt: tx.receivedAt,
      splits: tx.splits
        .filter((s) => parseFloat(s.amountNaira) > 0)
        .map((s) => ({
          bucketId: s.bucketId,
          bucketName: s.bucket?.name ?? "Operating",
          bucketType: s.bucket?.type ?? "CUSTOM",
          amountNaira: s.amountNaira,
          rule: s.bucket?.rule,
        })),
    },
  };
}
