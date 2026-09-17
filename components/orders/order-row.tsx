import { memo } from "react";
import { formatDate, formatSignedCurrency } from "@/lib/format";
import { NEGATIVE_ORDER_STATUSES, OrderStatusIndicator } from "@/components/orders/order-status";
import { StickyLedgerCell } from "@/components/orders/sticky-ledger-cell";
import type { Order } from "@/lib/types/order";
import { cn } from "@/lib/utils";

interface OrderRowProps {
  order: Order;
}

// Wrapped in React.memo: OrdersTable can re-render for reasons unrelated
// to any single row's own data — pagination/filters live in the URL and
// cause the Server Component above to refetch, but a future interactive
// addition (row hover, a selection checkbox) could re-render OrdersTable
// without any individual `order` object changing. memo skips re-rendering
// a row whose own props are referentially unchanged. Pairs with
// useCallback once a callback prop exists (e.g. click -> /orders/[id] in
// Phase 4) — useCallback only earns its keep alongside a memoized child
// like this one; there's no callback prop yet, so none is added
// speculatively.
export const OrderRow = memo(function OrderRow({ order }: OrderRowProps) {
  const negative = NEGATIVE_ORDER_STATUSES.has(order.status);

  return (
    <tr className="border-b border-grid-line last:border-b-0">
      {/* Order id leads (not date) so it's the column that's still visible
          once the table scrolls horizontally on mobile — StickyLedgerCell
          pins it there and carries the status-color stamp (see that
          file's own comment for why it's a box-shadow, not a border). */}
      <StickyLedgerCell
        sticky="left"
        status={order.status}
        className="font-mono text-[13px] whitespace-nowrap text-muted-foreground"
      >
        {order.id}
      </StickyLedgerCell>
      {/* Full date (with year), not the short "MMM d" the dashboard
          ledger uses — this table has an actual date-range filter tied to
          it, so the date is something users scan/filter by, not just
          secondary metadata. */}
      <td className="px-4 py-2.5 font-mono text-[13px] whitespace-nowrap">{formatDate(order.createdAt)}</td>
      <td className="px-4 py-2.5 font-medium">{order.customerName}</td>
      <td className="px-4 py-2.5">
        <OrderStatusIndicator status={order.status} />
      </td>
      <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums", negative && "text-destructive")}>
        {formatSignedCurrency(order.total, negative)}
      </td>
    </tr>
  );
});
