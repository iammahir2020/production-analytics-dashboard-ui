import { ChartPie } from "lucide-react";
import { getOrderStatusBreakdown } from "@/lib/api/analytics";
import { formatPercent } from "@/lib/format";
import { NEGATIVE_ORDER_STATUSES, ORDER_STATUS_STYLES } from "@/components/orders/order-status";
import { EmptyState } from "@/components/shared/empty-state";
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

  // getOrderStatusBreakdown always returns all 5 statuses, so the array is
  // never empty — total === 0 is what "no data" actually looks like here.
  // Worth catching: Recharts draws no arcs at all when every value is 0,
  // so the real render would be a blank 160px square beside a legend of
  // zeros, which reads as a broken chart rather than an empty one.
  if (total === 0) {
    return (
      <section className="flex h-full flex-col gap-3">
        <SectionHeading>Order status</SectionHeading>
        <Card className="flex-1">
          <EmptyState
            icon={<ChartPie className="size-6 text-muted-foreground" aria-hidden="true" />}
            title="No orders to break down"
            className="py-10"
          />
        </Card>
      </section>
    );
  }

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
        {/* flex-col below sm (640px): the donut is a fixed 160px and
            shrink-0 (see StatusDonut) — side by side with the legend at
            this section's actual mobile width (full page width minus
            page + card padding, ~311px), there's only ~135px left for
            the legend, not enough to fit "Cancelled / refunded" plus its
            value on one line. Stacking (donut centered above a full-
            width legend) avoids that instead of shrinking the donut,
            which would cut into the one place this section actually
            needs to stay legible at a glance. */}
        <CardContent className="flex flex-1 flex-col items-center gap-4 sm:flex-row">
          <StatusDonut data={breakdown} />
          <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
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
        <CardContent className="flex flex-1 flex-col items-center gap-4 sm:flex-row">
          <Skeleton className="size-40 shrink-0 rounded-full" />
          <div className="flex w-full flex-1 flex-col gap-2">
            {Array.from({ length: LEGEND_ROW_COUNT }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-6" />
              </div>
            ))}
            {/* Mirrors the real component's cancellation-rate summary row
                (mt-1/border-t/pt-2) — omitting it wasn't just a height
                gap, it meant a whole row appearing from nothing once data
                loaded. Caught via a real loading-state measurement, see
                learn.md. */}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-grid-line pt-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
