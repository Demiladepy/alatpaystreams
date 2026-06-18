export function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export function daysUntilNextVatFiling(from = new Date()): number {
  const filingDay = 21;
  let year = from.getFullYear();
  let month = from.getMonth() + 1;

  let deadline = new Date(year, month, filingDay, 23, 59, 59);
  if (from > deadline) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    deadline = new Date(year, month, filingDay, 23, 59, 59);
  }

  return Math.ceil((deadline.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
