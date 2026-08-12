import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { getProductDetail } from "@/lib/data/product";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { AddProductButton } from "@/components/dashboard/add-product-button";
import { externalPriceLinks } from "@/lib/price-search/external-links";
import { formatMoney } from "@/lib/currency";
import { formatFriendlyDate } from "@/lib/dates";

export default async function ProductPage({
  params,
}: PageProps<"/product/[id]">) {
  const { id } = await params;
  const { household } = await requireHousehold();
  const supabase = await createClient();

  const detail = await getProductDetail(supabase, household.id, id);
  if (!detail) notFound();
  const { product, purchases, stats } = detail;
  const currency = household.currency_code;
  const links = externalPriceLinks(product.name);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-2">
        <Link
          href="/history?tab=shopping"
          aria-label="Back"
          className="h-9 w-9 -ml-2 rounded-full flex items-center justify-center hover:bg-surface-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <AddProductButton productId={product.id} name={product.name} />
      </div>

      <div className="px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {product.name}
          </h1>
          {stats.lastPurchasedAt && (
            <p className="text-muted text-sm mt-0.5">
              Last bought {formatFriendlyDate(stats.lastPurchasedAt, household.timezone)}
              {stats.typicalStoreName ? ` · ${stats.typicalStoreName}` : ""}
            </p>
          )}
        </div>

        {/* Price summary */}
        {(stats.lastPrice != null || stats.averagePrice != null) && (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Last paid" value={formatMoney(stats.lastPrice, currency)} />
            <Stat label="Typical" value={formatMoney(stats.averagePrice, currency)} />
            <Stat label="Lowest" value={formatMoney(stats.lowestPrice, currency)} />
          </div>
        )}

        {/* Check prices */}
        <section className="space-y-2">
          <SectionTitle>Check prices</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center h-9 px-4 rounded-full border border-border bg-surface text-sm font-medium"
              >
                {l.label}
              </a>
            ))}
          </div>
        </section>

        {/* History */}
        <section className="space-y-2">
          <SectionTitle>
            History · {stats.count} purchase{stats.count === 1 ? "" : "s"}
          </SectionTitle>
          {purchases.length === 0 ? (
            <p className="text-muted text-sm px-1">No purchases yet.</p>
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="text-sm">
                    {formatFriendlyDate(p.purchased_at, household.timezone)}
                    {p.storeName ? ` · ${p.storeName}` : ""}
                  </div>
                  <div className="text-sm font-medium">
                    {p.price != null ? formatMoney(p.price, currency) : "—"}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-2">
        {label}
      </div>
      <div className="text-lg font-semibold mt-0.5">{value || "—"}</div>
    </Card>
  );
}
