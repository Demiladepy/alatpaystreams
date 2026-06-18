"use client";

export function StepSetRules() {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-card">
      <h2 className="font-display text-xl font-semibold text-forest">
        Set your rules
      </h2>
      <p className="mt-2 text-muted-foreground">
        Define percentages, fixed amounts, or weekly payouts for each bucket.
        Content coming soon.
      </p>
      <div className="mt-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-cream-dark"
          />
        ))}
      </div>
    </div>
  );
}
