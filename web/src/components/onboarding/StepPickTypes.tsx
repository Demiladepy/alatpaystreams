"use client";

export function StepPickTypes() {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-card">
      <h2 className="font-display text-xl font-semibold text-forest">
        Pick bucket types
      </h2>
      <p className="mt-2 text-muted-foreground">
        Choose which pots to split your income into — tax, savings, suppliers,
        and more. Content coming soon.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {["Tax", "Savings", "Supplier", "Salary", "Loan", "Custom"].map(
          (type) => (
            <div
              key={type}
              className="flex h-20 items-center justify-center rounded-xl bg-cream-dark text-sm font-medium text-muted-foreground"
            >
              {type}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
