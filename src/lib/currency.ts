/** Format a numeric amount as household currency (default AUD). */
export function formatMoney(
  amount: number | null | undefined,
  currency = "AUD",
): string {
  if (amount == null) return "";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
