"use client";

import Link from "next/link";
import { NEGATIVE_ORDER_STATUSES, OrderStatusIndicator } from "@/components/orders/order-status";
import { StickyLedgerCell } from "@/components/orders/sticky-ledger-cell";
import { useOrderRowLink } from "@/hooks/use-order-row-link";
import { formatShortDate, formatSignedCurrency } from "@/lib/format";
import type { Order } from "@/lib/types/order";
import { cn } from "@/lib/utils";

interface RecentOrderRowProps {
  order: Order;
}

// Its own component (not inlined in RecentOrdersList's .map(), the way it
// used to be) specifically so it can use useOrderRowLink — a hook can't
// be called from inside a loop or from RecentOrdersList itself, which is
// an async Server Component. The real <Link> goes on the Particulars
// cell (id + customer name), not the sticky Date cell — Date isn't this
// row's identifier the way order id is in the orders-page table, so the
// link belongs on the cell that actually identifies the order.
export function RecentOrderRow({ order }: RecentOrderRowProps) {
  const { href, handleRowClick } = useOrderRowLink(order.id);
  const negative = NEGATIVE_ORDER_STATUSES.has(order.status);

  return (
    <tr
      onClick={handleRowClick}
      className="group cursor-pointer border-b border-grid-line last:border-b-0 hover:bg-muted/40"
    >
      <StickyLedgerCell
        sticky="left"
        status={order.status}
        className="font-mono text-[13px] whitespace-nowrap text-muted-foreground group-hover:bg-muted/40"
      >
        {formatShortDate(order.createdAt)}
      </StickyLedgerCell>
      <td className="px-4 py-2.5">
        <Link href={href} className="hover:text-foreground hover:underline">
          <span className="font-mono text-[13px] text-muted-foreground">{order.id}</span>{" "}
          <span className="font-medium">{order.customerName}</span>
        </Link>
      </td>
      <td className="px-4 py-2.5">
        <OrderStatusIndicator status={order.status} />
      </td>
      <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums", negative && "text-destructive")}>
        {formatSignedCurrency(order.total, negative)}
      </td>
    </tr>
  );
}
