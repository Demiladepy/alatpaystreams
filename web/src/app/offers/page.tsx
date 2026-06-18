import { CreditCard } from "lucide-react";

export default function OffersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">
          Loan offers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Working capital offers based on your cash flow — coming soon.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 shadow-card">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-dark">
          <CreditCard className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-center text-muted-foreground">
          No offers available yet. Keep routing income to unlock pre-approved
          loans.
        </p>
      </div>
    </div>
  );
}
