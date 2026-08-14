"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ImageThumb } from "@/components/shopping/image-thumb";
import { completeShoppingItem, undoShoppingPurchase } from "@/actions/shopping";
import { groupShopping } from "@/lib/shopping-group";
import type { ShoppingItem, Store } from "@/types/db";
import { cn } from "@/lib/utils";

/**
 * Distraction-free shopping mode (build spec §23): pick a store, then a big
 * tap-friendly checklist. Purchases sync immediately.
 */
export function ShoppingMode({
  initialItems,
  stores,
  imageUrls = {},
}: {
  initialItems: ShoppingItem[];
  stores: Store[];
  imageUrls?: Record<string, string>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState(initialItems);
  const [storeId, setStoreId] = React.useState<string | null>(null);

  const grouped = groupShopping(items, stores);
  // Build a per-store view including a synthetic "Urgent" bucket.
  const storeOptions = [
    ...(grouped.urgent.length > 0
      ? [{ id: "urgent", name: "Urgent", icon: "⚠️", count: grouped.urgent.length }]
      : []),
    ...grouped.groups.map((g) => ({
      id: g.store?.id ?? "none",
      name: g.store?.name ?? "No store",
      icon: g.store?.icon ?? "📦",
      count: g.items.length,
    })),
  ];

  const currentItems =
    storeId === "urgent"
      ? grouped.urgent
      : storeId
        ? (grouped.groups.find((g) => (g.store?.id ?? "none") === storeId)
            ?.items ?? [])
        : [];

  async function check(item: ShoppingItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const res = await completeShoppingItem(item.id);
    if (!res.ok) {
      setItems((prev) => [...prev, item]);
      toast({ message: res.message });
      return;
    }
    toast({
      message: `Purchased ${item.name}`,
      actionLabel: "Undo",
      onAction: async () => {
        const u = await undoShoppingPurchase(item.id);
        if (u.ok) setItems((prev) => [...prev, item]);
        router.refresh();
      },
    });
    router.refresh();
  }

  // Store picker.
  if (!storeId) {
    return (
      <div className="px-4">
        <ModeHeader title="Start shopping" />
        {storeOptions.length === 0 ? (
          <p className="text-muted text-center py-16">
            Nothing to buy right now.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {storeOptions.map((s) => (
              <button
                key={s.id}
                onClick={() => setStoreId(s.id)}
                className="rounded-xl border border-border bg-surface p-4 text-left active:bg-surface-2"
              >
                <div className="text-2xl">{s.icon}</div>
                <div className="mt-2 font-semibold">{s.name}</div>
                <div className="text-sm text-muted">
                  {s.count} item{s.count === 1 ? "" : "s"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const store = storeOptions.find((s) => s.id === storeId);
  const done = currentItems.length === 0;

  return (
    <div className="px-4">
      <ModeHeader
        title={store?.name ?? "Shopping"}
        onBack={() => setStoreId(null)}
      />

      {done ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success flex items-center justify-center">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold">{store?.name} done ✓</h3>
          <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
            <Button variant="secondary" onClick={() => setStoreId(null)}>
              Back to shopping
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-muted text-sm mb-3">
            {currentItems.length} remaining
          </p>
          <ul className="space-y-2">
            {currentItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => check(item)}
                  className="w-full flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-4 text-left active:bg-surface-2"
                >
                  <span className="shrink-0 h-8 w-8 rounded-full border-2 border-border-strong" />
                  {imageUrls[item.id] && (
                    <ImageThumb
                      url={imageUrls[item.id]}
                      alt={item.name}
                      className="h-16 w-16"
                    />
                  )}
                  <span className="text-lg font-medium flex-1">
                    {item.name}
                    {item.quantity != null && (
                      <span className="text-muted text-base font-normal">
                        {" "}
                        · {item.quantity}
                        {item.unit ? ` ${item.unit}` : ""}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ModeHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-5">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Back"
          className="h-9 w-9 -ml-2 rounded-full flex items-center justify-center hover:bg-surface-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      ) : (
        <Link
          href="/buy"
          aria-label="Back to Buy"
          className={cn(
            "h-9 w-9 -ml-2 rounded-full flex items-center justify-center hover:bg-surface-2",
          )}
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
      )}
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  );
}
