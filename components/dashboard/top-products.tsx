import { PackageOpen } from "lucide-react";
import { getTopProducts } from "@/lib/api/analytics";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TOP_PRODUCTS_LIMIT = 5;

// A ranked list, not a chart — five items read faster as ranked rows than
// as a bar chart would, and this reuses the ledger's own row/rule/
// tabular-nums conventions (Phase 2b) rather than inventing a third
// numeric-display pattern. Aggregates order.items[], which every order
// already carries but nothing on the dashboard had read until now.
export async function TopProducts() {
  const products = await getTopProducts(TOP_PRODUCTS_LIMIT);

  // Reachable without an empty dataset: this aggregates spent-status
  // orders only, so a period where every order was cancelled or refunded
  // legitimately produces no top products at all.
  if (products.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeading>Top products</SectionHeading>
        <Card>
          <EmptyState
            icon={<PackageOpen className="size-6 text-muted-foreground" aria-hidden="true" />}
            title="No product sales yet"
            className="py-10"
          />
        </Card>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>Top products</SectionHeading>
      <Card className="overflow-hidden py-0">
        <ul>
          {products.map((product, index) => (
            <li
              key={product.productName}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2.5 text-sm",
                index !== products.length - 1 && "border-b border-grid-line"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-4 shrink-0 text-right font-mono text-[13px] text-muted-foreground">
                  {index + 1}
                </span>
                <span className="truncate font-medium">{product.productName}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="text-[13px] tabular-nums text-muted-foreground">{product.unitsSold} sold</span>
                <span className="font-semibold tabular-nums">{formatCurrency(product.revenue)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

// Bars are h-5 (20px), not h-3.5 (14px) — matching text-sm's real 20px
// line-height rather than an arbitrary smaller placeholder. Measured via
// a real loading-state screenshot (see learn.md): the shorter bars made
// this card ~33px shorter than its real content, which mattered doubly
// here since OrderStatusBreakdown stretches (h-full/flex-1) to match
// whichever of the two is naturally taller in the same grid row.
export function TopProductsSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>Top products</SectionHeading>
      <Card className="overflow-hidden py-0">
        <ul>
          {Array.from({ length: TOP_PRODUCTS_LIMIT }).map((_, index) => (
            <li
              key={index}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2.5",
                index !== TOP_PRODUCTS_LIMIT - 1 && "border-b border-grid-line"
              )}
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
