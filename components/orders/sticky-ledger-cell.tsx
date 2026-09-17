import type { ReactNode } from "react";
import { ORDER_STATUS_COLOR_VAR } from "@/components/orders/order-status";
import type { OrderStatus } from "@/lib/types/order";
import { cn } from "@/lib/utils";

type StickyEdge = "left" | "top" | "corner";

interface StickyLedgerCellProps {
  as?: "td" | "th";
  /**
   * "left": the leading column (pinned during horizontal scroll).
   * "top": a header cell in a row that freezes during vertical scroll.
   * "corner": the leading column's own header cell — needs both.
   * Required, not defaulted: three meaningfully different roles with no
   * sensible universal default forces every call site to say which one it
   * actually needs, rather than silently inheriting one that happened to
   * be right for the first use.
   */
  sticky: StickyEdge;
  status?: OrderStatus;
  className?: string;
  children: ReactNode;
}

// The sticky cells shared by every ledger-style table in this app —
// RecentOrdersList (dashboard) and OrdersTable (orders page). Two
// independent freezes compose here: the leading column (left, for
// horizontal scroll on mobile) and the header row (top, for vertical
// scroll once a table has more rows than fit the view — OrdersTable can
// now show up to 50). They intersect at exactly one cell, the corner,
// which needs both at once and a higher z-index so it stays above the
// other two sticky layers when they scroll past underneath it.
//
// Every accent here is a box-shadow, not a border. `position: sticky`
// cells inside a `border-collapse` table have a real, documented browser
// quirk (worst in Chrome) where a genuine border on the sticky cell
// doesn't reliably repaint at its current scrolled position — confirmed
// directly against this table on the left/right edge, and the same
// mechanism applies on the top/bottom edge for the header-row freeze. A
// box-shadow isn't part of the border model and isn't affected by
// border-collapse at all, so it stays correctly attached wherever the
// cell actually is, on either axis.
const STICKY_POSITION: Record<StickyEdge, string> = {
  left: "sticky left-0 z-10",
  top: "sticky top-0 z-10",
  corner: "sticky top-0 left-0 z-20",
};

export function StickyLedgerCell({ as = "td", sticky, status, className, children }: StickyLedgerCellProps) {
  const Tag = as;
  const padding = as === "th" ? "px-4 pt-4 pb-2" : "px-4 py-2.5";

  const shadows: string[] = [];
  if (status) shadows.push(`inset 3px 0 0 0 ${ORDER_STATUS_COLOR_VAR[status]}`);
  if (sticky === "left" || sticky === "corner") shadows.push("inset -1px 0 0 0 var(--border)");
  if (sticky === "top" || sticky === "corner") shadows.push("inset 0 -1px 0 0 var(--border)");

  return (
    <Tag
      className={cn(STICKY_POSITION[sticky], "bg-card", padding, className)}
      style={{ boxShadow: shadows.join(", ") }}
    >
      {children}
    </Tag>
  );
}
