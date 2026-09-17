import { getOrderStatusBreakdown } from "@/lib/api/analytics";
import { formatPercent } from "@/lib/format";
import { NEGATIVE_ORDER_STATUSES, ORDER_STATUS_STYLES } from "@/components/orders/order-status";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LEGEND_ROW_COUNT = 5;

// Status was previously only visible per-row in the ledger, never
// aggregated — this is the donut + legend view of the same 5-color
// palette, plus the cancellation/refund rate derived from the same fetch
// (no second call for it).
export async function OrderStatusBreakdown() {
  const breakdown = await getOrderStatusBreakdown();
  const total = breakdown.reduce((sum, point) => sum + point.count, 0);
  const negativeCount = breakdown
    .filter((point) => NEGATIVE_ORDER_STATUSES.has(point.status))
    .reduce((sum, point) => sum + point.count, 0);
  const cancellationRate = total > 0 ? negativeCount / total : 0;

  return (
    // h-full + Card/CardContent flex-1: this section's neighbor in the
    // grid row (TopProducts, 5 rows) is naturally taller than a 5-line
    // legend, and neither Suspense nor SectionBoundary/ErrorBoundary
    // render a wrapping element to stretch through — the grid's own
    // align-items:stretch only reaches as far as this section's direct
    // parent div. Without this, the two cards in the row visibly end at
    // different heights. items-center on the now-stretched CardContent
    // vertically centers the donut+legend in the extra space, rather than
    // leaving it pinned to the top with dead space below.
    <section className="flex h-full flex-col gap-3">
      <SectionHeading>Order status</SectionHeading>
      <Card className="flex-1">
        <CardContent className="flex flex-1 items-center gap-4">
          <StatusDonut data={breakdown} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {breakdown.map((point) => {
              const style = ORDER_STATUS_STYLES[point.status];
              return (
                <div key={point.status} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
                    {style.label}
                  </span>
                  <span className="font-medium tabular-nums">{point.count}</span>
                </div>
              );
            })}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-grid-line pt-2 text-[13px]">
              <span className="text-muted-foreground">Cancelled / refunded</span>
              <span className={cn("font-medium tabular-nums", negativeCount > 0 && "text-destructive")}>
                {formatPercent(cancellationRate, 1)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function OrderStatusBreakdownSkeleton() {
  return (
    <section className="flex h-full flex-col gap-3">
      <SectionHeading>Order status</SectionHeading>
      <Card className="flex-1">
        <CardContent className="flex flex-1 items-center gap-4">
          <Skeleton className="size-40 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            {Array.from({ length: LEGEND_ROW_COUNT }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-6" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
