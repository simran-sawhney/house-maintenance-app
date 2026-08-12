import type { PriceSearchProvider, PriceSearchResult } from "./types";

export type PriceLink = { label: string; url: string };

/**
 * Build targeted external search links for a product name (build spec §25).
 * These open the retailer's own search — no scraping, no API keys.
 */
export function externalPriceLinks(query: string): PriceLink[] {
  const q = encodeURIComponent(query.trim());
  return [
    { label: "Google", url: `https://www.google.com/search?q=${q}+price` },
    {
      label: "Woolworths",
      url: `https://www.woolworths.com.au/shop/search/products?searchTerm=${q}`,
    },
    {
      label: "Coles",
      url: `https://www.coles.com.au/search?q=${q}`,
    },
    {
      label: "Aldi",
      url: `https://www.aldi.com.au/en/search/?text=${q}`,
    },
  ];
}

/**
 * Placeholder provider — returns link-only results and no prices. Swap for a
 * real integration later without touching callers' contracts.
 */
export const externalLinkProvider: PriceSearchProvider = {
  async search(query: string): Promise<PriceSearchResult[]> {
    return externalPriceLinks(query).map((l) => ({
      store: l.label,
      url: l.url,
    }));
  },
};
