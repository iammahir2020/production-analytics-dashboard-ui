"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";

// Row-click-navigates-to-order-details logic, shared by OrderRow (orders
// page) and RecentOrderRow (dashboard) — the second real call site is
// what made this worth lifting out rather than copy-pasting the same
// handler twice. A <tr> can't itself be an <a> around <td>s (invalid
// table structure), so each row still renders its own real <Link> on
// whichever cell is its natural identifier (order id, or id+customer);
// this hook only owns the href and the whole-row mouse-click affordance
// around it. The guard skips the redundant push when the click already
// landed on that Link — its own click handler already navigates.
export function useOrderRowLink(orderId: string) {
  const router = useRouter();
  const href = `/orders/${orderId}`;

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest("a")) return;
    router.push(href);
  }

  return { href, handleRowClick };
}
