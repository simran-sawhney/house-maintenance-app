"use client";

import { ShoppingCart, CheckSquare } from "lucide-react";
import { QuickAddTrigger } from "@/components/quick-add/quick-add-trigger";
import type { Store } from "@/types/db";

/** Home quick actions (build spec §93): + Buy, + Task, store shortcuts. */
export function QuickActions({ stores }: { stores: Store[] }) {
  const shortcuts = stores.slice(0, 4);
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      <QuickAddTrigger
        preset={{ kind: "buy" }}
        className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium"
      >
        <ShoppingCart className="h-4 w-4" />
        Buy
      </QuickAddTrigger>
      <QuickAddTrigger
        preset={{ kind: "task" }}
        className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium"
      >
        <CheckSquare className="h-4 w-4" />
        Task
      </QuickAddTrigger>
      {shortcuts.map((s) => (
        <QuickAddTrigger
          key={s.id}
          preset={{ kind: "buy", storeId: s.id, batch: true }}
          className="shrink-0 inline-flex items-center gap-1 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium"
        >
          {s.icon} {s.name}
        </QuickAddTrigger>
      ))}
    </div>
  );
}
