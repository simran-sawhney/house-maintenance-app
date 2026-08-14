"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { SectionTitle } from "@/components/ui/primitives";
import { PurchaseSheet } from "@/components/shopping/purchase-sheet";
import { EditItemSheet } from "@/components/shopping/edit-item-sheet";
import { ImageThumb } from "@/components/shopping/image-thumb";
import { completeShoppingItem, undoShoppingPurchase } from "@/actions/shopping";
import { groupShopping } from "@/lib/shopping-group";
import type { ShoppingItem, Store } from "@/types/db";
import { cn } from "@/lib/utils";

export function ShoppingBoard({
  initialItems,
  stores,
  currency,
  imageUrls = {},
}: {
  initialItems: ShoppingItem[];
  stores: Store[];
  currency: string;
  imageUrls?: Record<string, string>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState(initialItems);
  const [editing, setEditing] = React.useState<ShoppingItem | null>(null);
  const [purchase, setPurchase] = React.useState<{
    id: string | null;
    name: string;
    quantity: number | null;
  } | null>(null);

  // Adopt fresh server data on refresh (render-phase sync, not an effect).
  const [prevInitial, setPrevInitial] = React.useState(initialItems);
  if (prevInitial !== initialItems) {
    setPrevInitial(initialItems);
    setItems(initialItems);
  }

  const grouped = groupShopping(items, stores);

  async function complete(item: ShoppingItem) {
    // Optimistic: remove immediately.
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    const res = await completeShoppingItem(item.id);
    if (!res.ok) {
      setItems((prev) => [...prev, item]); // rollback
      toast({ message: res.message });
      return;
    }
    // Offer undo, then the optional price sheet.
    toast({
      message: `Purchased ${item.name}`,
      actionLabel: "Undo",
      onAction: async () => {
        const u = await undoShoppingPurchase(item.id);
        if (u.ok) {
          setItems((prev) =>
            prev.some((i) => i.id === item.id) ? prev : [...prev, item],
          );
          router.refresh();
        }
      },
    });
    setPurchase({ id: res.purchaseId, name: item.name, quantity: item.quantity });
    router.refresh();
  }

  if (items.length === 0) {
    return <EmptyShopping />;
  }

  return (
    <div className="space-y-6">
      {grouped.urgent.length > 0 && (
        <section className="space-y-2">
          <SectionTitle className="flex items-center gap-1.5 text-urgent">
            <AlertCircle className="h-3.5 w-3.5" />
            Urgent
          </SectionTitle>
          <ItemList
            items={grouped.urgent}
            imageUrls={imageUrls}
            onComplete={complete}
            onEdit={setEditing}
          />
        </section>
      )}

      {grouped.groups.map((group) => (
        <section key={group.store?.id ?? "none"} className="space-y-2">
          <SectionTitle>
            {group.store
              ? `${group.store.icon ?? ""} ${group.store.name}`.trim()
              : "No store yet"}{" "}
            · {group.items.length}
          </SectionTitle>
          <ItemList
            items={group.items}
            imageUrls={imageUrls}
            onComplete={complete}
            onEdit={setEditing}
          />
        </section>
      ))}

      {editing && (
        <EditItemSheet
          key={editing.id}
          open
          onClose={() => setEditing(null)}
          item={editing}
          stores={stores}
          imageUrl={imageUrls[editing.id] ?? null}
          onChanged={(patch) =>
            setItems((prev) =>
              prev.map((i) => (i.id === editing.id ? { ...i, ...patch } : i)),
            )
          }
          onRemoved={() =>
            setItems((prev) => prev.filter((i) => i.id !== editing.id))
          }
        />
      )}

      {purchase && (
        <PurchaseSheet
          key={purchase.id ?? "purchase"}
          open
          onClose={() => setPurchase(null)}
          purchaseId={purchase.id}
          itemName={purchase.name}
          defaultQuantity={purchase.quantity}
          currency={currency}
        />
      )}
    </div>
  );
}

function ItemList({
  items,
  imageUrls,
  onComplete,
  onEdit,
}: {
  items: ShoppingItem[];
  imageUrls: Record<string, string>;
  onComplete: (i: ShoppingItem) => void;
  onEdit: (i: ShoppingItem) => void;
}) {
  return (
    <ul className="rounded-xl bg-surface border border-border divide-y divide-border overflow-hidden">
      {items.map((item) => (
        <ShoppingRow
          key={item.id}
          item={item}
          imageUrl={imageUrls[item.id] ?? null}
          onComplete={() => onComplete(item)}
          onEdit={() => onEdit(item)}
        />
      ))}
    </ul>
  );
}

export function ShoppingRow({
  item,
  imageUrl,
  onComplete,
  onEdit,
}: {
  item: ShoppingItem;
  imageUrl?: string | null;
  onComplete: () => void;
  onEdit: () => void;
}) {
  const [checked, setChecked] = React.useState(false);
  const meta = [
    item.quantity != null
      ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
      : item.unit,
    item.notes,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center gap-3 pl-3 pr-2 py-1">
      <button
        aria-label={`Mark ${item.name} purchased`}
        onClick={() => {
          setChecked(true);
          setTimeout(onComplete, 120);
        }}
        className={cn(
          "shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center transition touch-manipulation",
          checked
            ? "bg-success border-success"
            : "border-border-strong hover:border-muted",
        )}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      {imageUrl && (
        <ImageThumb url={imageUrl} alt={item.name} className="h-12 w-12" />
      )}
      <button
        onClick={onEdit}
        className="flex-1 text-left py-2 min-w-0"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[15px] text-foreground truncate",
              checked && "line-through text-muted",
            )}
          >
            {item.name}
          </span>
          {item.urgent && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-urgent" />
          )}
        </div>
        {meta && <div className="text-xs text-muted truncate">{meta}</div>}
      </button>
    </li>
  );
}

export function EmptyShopping() {
  return (
    <div className="text-center py-16 px-6">
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-success-soft flex items-center justify-center text-2xl">
        ✓
      </div>
      <h3 className="text-lg font-semibold">Nothing to buy</h3>
      <p className="text-muted mt-1 text-sm">
        Nice work — your list is clear.
      </p>
    </div>
  );
}
