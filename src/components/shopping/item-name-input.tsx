"use client";

import * as React from "react";
import {
  searchProductsForAutocomplete,
  type AutocompleteSuggestion,
} from "@/actions/products";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { searchCatalog } from "@/lib/grocery/catalog";
import { normalizeItemName } from "@/lib/utils";
import { Input } from "@/components/ui/primitives";

/**
 * Item name field with suggestions (build spec §20) drawn from two sources:
 *   1. the household's own products (with real store/qty/unit defaults)
 *   2. a built-in grocery catalogue (so suggestions work from day one)
 * History wins on duplicates; catalogue fills the rest.
 */
export function ItemNameInput({
  value,
  onChange,
  onPick,
  autoFocus,
  placeholder = "What do we need?",
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: AutocompleteSuggestion) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const { stores } = useQuickAdd();
  const [history, setHistory] = React.useState<AutocompleteSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const justPicked = React.useRef(false);

  // Map a catalogue store *name* to this household's store id.
  const storeIdByName = React.useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const s of stores) m.set(s.name.toLowerCase(), { id: s.id, name: s.name });
    return m;
  }, [stores]);

  // Fetch history-based products (debounced, needs 2+ chars).
  React.useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (q.length < 2) {
        setHistory([]);
        return;
      }
      const res = await searchProductsForAutocomplete(q);
      setHistory(res);
      setOpen(true);
    }, 180);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  // Merge history + catalogue synchronously as the user types.
  const suggestions = React.useMemo<AutocompleteSuggestion[]>(() => {
    const q = value.trim();
    if (q.length < 1) return [];
    const seen = new Set(history.map((h) => normalizeItemName(h.name)));
    const merged: AutocompleteSuggestion[] = [...history];
    for (const item of searchCatalog(q, 8)) {
      const norm = normalizeItemName(item.name);
      if (seen.has(norm)) continue;
      seen.add(norm);
      const mapped = item.store
        ? storeIdByName.get(item.store.toLowerCase())
        : undefined;
      merged.push({
        productId: `catalog:${norm}`,
        name: item.name,
        storeId: mapped?.id ?? null,
        storeName: mapped?.name ?? null,
        quantity: null,
        unit: null,
      });
      if (merged.length >= 8) break;
    }
    return merged.slice(0, 8);
  }, [value, history, storeIdByName]);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        enterKeyHint="done"
        aria-label="Item name"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.productId}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  justPicked.current = true;
                  onPick(s);
                  onChange(s.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-surface-2"
              >
                <span className="text-[15px] text-foreground">{s.name}</span>
                {s.storeName && (
                  <span className="text-xs text-muted">{s.storeName}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
