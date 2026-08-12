/**
 * Pure interval maths for shopping suggestions (build spec §26, §80). No ML,
 * no external calls — just robust statistics over purchase timestamps.
 */

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const DAY = 86_400_000;

export type SuggestionStats = {
  typicalIntervalDays: number;
  daysSinceLast: number;
  eligible: boolean;
  score: number;
};

/**
 * Compute suggestion statistics for one product from its purchase timestamps.
 * Returns null when there isn't enough history to say anything useful.
 *
 *  - median interval preferred over mean (robust to outliers)
 *  - eligible once days-since-last reaches ~80% of the typical interval
 *  - score rises past the typical interval, dampened for irregular histories
 *    and thin history
 */
export function computeSuggestion(
  purchaseDatesMs: number[],
  nowMs: number,
  minPurchases = 3,
): SuggestionStats | null {
  if (purchaseDatesMs.length < minPurchases) return null;

  const sorted = [...purchaseDatesMs].sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i] - sorted[i - 1]) / DAY);
  }
  const med = median(intervals);
  if (med <= 0) return null;

  const last = sorted[sorted.length - 1];
  const daysSinceLast = (nowMs - last) / DAY;
  const eligible = daysSinceLast >= med * 0.8;

  // Regularity via coefficient of variation -> 0..1 (higher = steadier).
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance =
    intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const cov = mean > 0 ? Math.sqrt(variance) / mean : 1;
  const regularity = 1 / (1 + cov);

  const overdue = daysSinceLast / med; // ~1 at "due"
  const countFactor = Math.min(1, intervals.length / 6);
  const score = overdue * regularity * (0.6 + 0.4 * countFactor);

  return {
    typicalIntervalDays: med,
    daysSinceLast,
    eligible,
    score,
  };
}
