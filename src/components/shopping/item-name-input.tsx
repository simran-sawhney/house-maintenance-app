"use client";

import * as React from "react";
import {
  searchProductsForAutocomplete,
  type AutocompleteSuggestion,
} from "@/actions/products";
import { Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Item name field with product autocomplete (build spec §20). Selecting a
 * suggestion calls `onPick` so the parent can prefill store/quantity/unit.
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
  const [suggestions, setSuggestions] = React.useState<
    AutocompleteSuggestion[]
  >([]);
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const justPicked = React.useRef(false);

  React.useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (q.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const res = await searchProductsForAutocomplete(q);
      setSuggestions(res);
      setOpen(true);
    }, 180);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

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
        <ul className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
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
                className={cn(
                  "flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-surface-2",
                )}
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
