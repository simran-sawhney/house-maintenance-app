"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { addProductToList } from "@/actions/shopping";

export type SuggestionView = {
  productId: string;
  name: string;
  typicalIntervalDays: number;
  daysSinceLast: number;
  storeName: string | null;
};

export function Suggestions({ initial }: { initial: SuggestionView[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState(initial);
  const [busy, setBusy] = React.useState<string | null>(null);

  if (items.length === 0) return null;

  async function add(s: SuggestionView) {
    setBusy(s.productId);
    const res = await addProductToList(s.productId);
    setBusy(null);
    if (res.status === "error") {
      toast({ message: res.message });
      return;
    }
    setItems((p) => p.filter((x) => x.productId !== s.productId));
    toast({ message: `Added ${s.name}` });
    router.refresh();
  }

  return (
    <section className="space-y-2">
      <SectionTitle>You may need soon</SectionTitle>
      <div className="space-y-2">
        {items.map((s) => (
          <Card key={s.productId} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-xs text-muted">
                Usually every {Math.max(1, Math.round(s.typicalIntervalDays))}{" "}
                days · last bought {Math.round(s.daysSinceLast)} day
                {Math.round(s.daysSinceLast) === 1 ? "" : "s"} ago
                {s.storeName ? ` · ${s.storeName}` : ""}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => add(s)}
              disabled={busy === s.productId}
            >
              {busy === s.productId ? "Adding…" : "Add"}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
