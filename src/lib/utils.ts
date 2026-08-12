import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalise a product / item name for duplicate detection, product matching
 * and autocomplete. Kept deliberately simple (see build spec §46):
 *   - trim
 *   - lowercase
 *   - collapse repeated internal whitespace
 *   - drop trailing/leading punctuation noise
 * Do NOT make this fuzzy — exact-ish matching only.
 */
export function normalizeItemName(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ") // punctuation -> space
    .replace(/\s+/g, " ")
    .trim();
}

/** Round to at most 2 decimals and strip trailing zeros. */
export function tidyNumber(n: number): string {
  return Number.parseFloat(n.toFixed(2)).toString();
}

/** Parse a possibly-empty numeric form field into a number or null. */
export function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
