/**
 * Service boundary for future automated price providers (build spec §25, §71).
 * V1 ships only the external-link implementation; nothing in the app depends on
 * a paid provider. To add one later, implement PriceSearchProvider and wire it
 * where `externalPriceLinks` is used today.
 */

export interface PriceSearchResult {
  store: string;
  price?: number;
  url: string;
}

export interface PriceSearchProvider {
  search(query: string): Promise<PriceSearchResult[]>;
}
