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

    // A held modifier (Cmd/Ctrl/Shift/Alt) or a non-primary button is the
    // browser's own "open in a new tab/background tab/window" gesture on
    // a real link — the same check react-router's own <Link> uses before
    // intercepting a click. This row isn't a link, so there's no href to
    // honor that gesture with; substituting an in-page push would replace
    // the tab the user meant to keep, which is worse than doing nothing.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

    // The same click that ends a text-selection drag (e.g. copying a
    // customer name) also fires this handler — a plain, undragged click
    // has already collapsed any selection by the time "click" fires, so
    // this only skips navigation for an actual drag-to-select, not stale
    // selection state left over from an earlier, unrelated interaction.
    if (window.getSelection()?.toString()) return;

    router.push(href);
  }

  return { href, handleRowClick };
}
