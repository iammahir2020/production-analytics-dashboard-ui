import { getTopProducts } from "@/lib/api/analytics";
import { formatCurrency } from "@/lib/format";
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
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-20" />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
