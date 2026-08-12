"use client";

import Link from "next/link";
import { Plus, Play } from "lucide-react";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import type { Store } from "@/types/db";

/**
 * Store shortcuts (build spec §13): tap a store to open Quick Add in batch
 * mode with that store preselected. Plus a "Start Shopping" entry point.
 */
export function StoreShortcuts({ stores }: { stores: Store[] }) {
  const { openQuickAdd } = useQuickAdd();
  const shortcut = stores.slice(0, 5);

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      <Link
        href="/buy/shop"
        className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium"
      >
        <Play className="h-4 w-4" />
        Start shopping
      </Link>
      {shortcut.map((s) => (
        <button
          key={s.id}
          onClick={() => openQuickAdd({ kind: "buy", storeId: s.id, batch: true })}
          className="shrink-0 inline-flex items-center gap-1 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium text-foreground"
        >
          <Plus className="h-3.5 w-3.5 text-muted" />
          {s.icon} {s.name}
        </button>
      ))}
    </div>
  );
}
