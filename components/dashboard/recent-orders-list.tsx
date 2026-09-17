import { getOrders } from "@/lib/api/orders";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecentOrderRow } from "@/components/dashboard/recent-order-row";
import { StickyLedgerCell } from "@/components/orders/sticky-ledger-cell";
import { cn } from "@/lib/utils";

const RECENT_LIMIT = 8;

// A real ledger table — date / particulars / status / amount — rather than
// three items floating in a flex row. The date column is the sticky
// leading cell (StickyLedgerCell, shared with the orders page's table) and
// carries the 3px status-colored stamp as part of that. Cancelled/refunded
// render in red ink with parenthesised amounts — real double-entry-
// bookkeeping convention, and it makes status legible from the amount
// column alone.
export async function RecentOrdersList() {
  const { orders } = await getOrders({ pageSize: RECENT_LIMIT });

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>Recent orders</SectionHeading>
      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <caption className="sr-only">Recent orders, most recent first</caption>
            <thead>
              <tr className="text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <StickyLedgerCell as="th" sticky="left">Date</StickyLedgerCell>
                <th className="px-4 pt-4 pb-2 font-semibold">Particulars</th>
                <th className="px-4 pt-4 pb-2 font-semibold">Status</th>
                <th className="px-4 pt-4 pb-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

// Row padding (py-2.5) and bar height (h-5, matching text-sm's real 20px
// line-height) mirror RecentOrderRow's actual cells, and a header-row
// placeholder mirrors the real <thead> — both gaps (shorter bars, a
// missing header) were caught by measuring the real loading state, not
// assumed; see learn.md.
export function RecentOrdersListSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>Recent orders</SectionHeading>
      <Card className="overflow-hidden py-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 border-b border-grid-line px-4 pt-4 pb-2">
            <Skeleton className="h-5 w-10 shrink-0" />
            <Skeleton className="h-5 w-20 flex-1" />
            <Skeleton className="h-5 w-12 shrink-0" />
            <Skeleton className="h-5 w-12 shrink-0" />
          </div>
          {Array.from({ length: RECENT_LIMIT }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-4 px-4 py-2.5",
                index !== RECENT_LIMIT - 1 && "border-b border-grid-line"
              )}
            >
              <Skeleton className="h-5 w-12 shrink-0" />
              <Skeleton className="h-5 w-32 flex-1" />
              <Skeleton className="h-5 w-16 shrink-0" />
              <Skeleton className="h-5 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
