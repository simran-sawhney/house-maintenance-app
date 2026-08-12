import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { getShoppingBoard } from "@/lib/data/shopping";
import { PageHeader } from "@/components/layout/page-header";
import { StoreShortcuts } from "@/components/shopping/store-shortcuts";
import { ShoppingBoard } from "@/components/shopping/shopping-board";
import type { Store } from "@/types/db";

export const metadata: Metadata = { title: "Buy" };

export default async function BuyPage() {
  const { household } = await requireHousehold();
  const supabase = await createClient();

  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .eq("household_id", household.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const storeList = (stores as Store[]) ?? [];
  const board = await getShoppingBoard(supabase, household.id, storeList);

  return (
    <div>
      <PageHeader
        title="Buy"
        subtitle={
          board.total > 0
            ? `${board.total} thing${board.total === 1 ? "" : "s"} to buy`
            : "One shared family list"
        }
        right={
          <Link
            href="/history?tab=shopping"
            aria-label="Shopping history"
            className="h-10 w-10 rounded-full flex items-center justify-center text-muted hover:bg-surface-2"
          >
            <History className="h-5 w-5" />
          </Link>
        }
      />
      <div className="px-4 space-y-5">
        <StoreShortcuts stores={storeList} />
        <ShoppingBoard
          initialItems={board.items}
          stores={storeList}
          currency={household.currency_code}
        />
      </div>
    </div>
  );
}
