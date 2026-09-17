"use client";

import { PackageSearch } from "lucide-react";
import { useOrderFiltersUrl } from "@/hooks/use-order-filters";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/orders";
import { OrderRow } from "@/components/orders/order-row";
import { StickyLedgerCell } from "@/components/orders/sticky-ledger-cell";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order } from "@/lib/types/order";
import { cn } from "@/lib/utils";

interface OrdersTableProps {
  orders: Order[];
}

// max-h-[65vh]: with up to 50 rows now selectable (see the page-size
// control), the table's natural height could run past 2000px — this caps
// it to a fraction of the viewport and lets it scroll internally instead,
// on both axes at once (overflow-auto, not overflow-x-auto), so the page
// itself never has to grow to accommodate a large page size.
const SCROLL_CONTAINER_CLASS = "max-h-[65vh] overflow-auto";

// Same date/particulars(split into id+customer here)/status/amount column
// convention as the dashboard's recent-orders ledger (Phase 2b) — that
// component's own comments already promised this carries into the Phase 3
// orders table. Order id and customer get separate columns here rather
// than one combined "particulars" column: this is the primary
// data-browsing surface, not a compact dashboard widget, so scanning down
// a dedicated customer column has real value it didn't have there.
export function OrdersTable({ orders }: OrdersTableProps) {
  const { clearFilters } = useOrderFiltersUrl();

  if (orders.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<PackageSearch className="size-8 text-muted-foreground" aria-hidden="true" />}
          title="No orders match your filters"
          description="Try adjusting or clearing your search, status, or date filters."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <div className={SCROLL_CONTAINER_CLASS}>
        <table className="w-full min-w-160 border-collapse text-sm">
          <caption className="sr-only">Orders</caption>
          <thead>
            <tr className="text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <StickyLedgerCell as="th" sticky="corner">
                Order
              </StickyLedgerCell>
              <StickyLedgerCell as="th" sticky="top">
                Date
              </StickyLedgerCell>
              <StickyLedgerCell as="th" sticky="top">
                Customer
              </StickyLedgerCell>
              <StickyLedgerCell as="th" sticky="top">
                Status
              </StickyLedgerCell>
              <StickyLedgerCell as="th" sticky="top" className="text-right">
                Amount
              </StickyLedgerCell>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface OrdersTableSkeletonProps {
  /** Matches the requested page size, which is already known from the URL
   * before the fetch resolves — so the skeleton shows roughly the right
   * number of rows instead of a fixed count that would visibly jump in
   * height once real content (up to 50 rows) streams in. Defaults to
   * DEFAULT_PAGE_SIZE (not a separately hand-picked number) — a real
   * loading-state measurement caught those two constants having drifted
   * apart (8 vs 10), which visibly changed the row count, not just row
   * heights, once data arrived. See learn.md. */
  rowCount?: number;
}

export function OrdersTableSkeleton({ rowCount = DEFAULT_PAGE_SIZE }: OrdersTableSkeletonProps) {
  return (
    <Card className="overflow-hidden py-0">
      <div className={cn(SCROLL_CONTAINER_CLASS, "flex flex-col")}>
        {/* Mirrors the real table's <thead> — measured at ~40px tall
            (StickyLedgerCell's th padding + label line) — omitting it
            entirely was itself a real height gap, not just the rows. */}
        <div className="flex items-center gap-4 border-b border-grid-line px-4 pt-4 pb-2">
          <Skeleton className="h-3 w-14 shrink-0" />
          <Skeleton className="h-3 w-12 shrink-0" />
          <Skeleton className="h-3 w-16 flex-1" />
          <Skeleton className="h-3 w-12 shrink-0" />
          <Skeleton className="h-3 w-14 shrink-0" />
        </div>
        {Array.from({ length: rowCount }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-4 px-4 py-2.5",
              index !== rowCount - 1 && "border-b border-grid-line"
            )}
          >
            <Skeleton className="h-5 w-16 shrink-0" />
            <Skeleton className="h-5 w-24 shrink-0" />
            <Skeleton className="h-5 w-28 flex-1" />
            <Skeleton className="h-5 w-20 shrink-0" />
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </Card>
  );
}
