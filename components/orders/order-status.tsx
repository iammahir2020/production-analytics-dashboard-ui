import type { OrderStatus } from "@/lib/types/order";
import { cn } from "@/lib/utils";

interface StatusStyle {
  label: string;
  border: string;
  dot: string;
  text: string;
}

// Ledger-stamp treatment, not a pill badge: a colored left-border bar on
// the row + a small dot + colored text — no background fill, no rounded
// badge shape (see .interface-design/system.md). Colors reuse existing
// semantic tokens (no new hues invented): pending→warning, processing→
// the brand accent ("in motion"), completed→success, cancelled→neutral
// (not alarming — a cancellation isn't a failure), refunded→danger.
//
// Full class strings are written out per status rather than assembled
// from a color name at runtime — Tailwind's build-time scanner only
// detects literal class names in source, not interpolated ones.
export const ORDER_STATUS_STYLES: Record<OrderStatus, StatusStyle> = {
  pending: { label: "Pending", border: "border-l-chart-3", dot: "bg-chart-3", text: "text-chart-3" },
  processing: { label: "Processing", border: "border-l-primary", dot: "bg-primary", text: "text-primary" },
  completed: { label: "Completed", border: "border-l-chart-2", dot: "bg-chart-2", text: "text-chart-2" },
  cancelled: { label: "Cancelled", border: "border-l-chart-4", dot: "bg-chart-4", text: "text-chart-4" },
  refunded: { label: "Refunded", border: "border-l-destructive", dot: "bg-destructive", text: "text-destructive" },
};

// Same mapping as ORDER_STATUS_STYLES, as raw CSS custom-property values
// instead of Tailwind classes — Recharts' <Cell fill> needs an actual
// color value, not a class name, so this is a second *form* the mapping
// has to exist in, not a second decision about what it should be.
export const ORDER_STATUS_COLOR_VAR: Record<OrderStatus, string> = {
  pending: "var(--chart-3)",
  processing: "var(--primary)",
  completed: "var(--chart-2)",
  cancelled: "var(--chart-4)",
  refunded: "var(--destructive)",
};

// What the ledger renders in red ink with parenthesised amounts — first
// used in recent-orders-list.tsx (Phase 2b), now reused by the status
// breakdown's cancellation-rate figure (Phase 2c). Two real call sites for
// the same domain rule is where it stopped making sense to keep as two
// separate local sets.
export const NEGATIVE_ORDER_STATUSES = new Set<OrderStatus>(["cancelled", "refunded"]);

interface OrderStatusIndicatorProps {
  status: OrderStatus;
}

export function OrderStatusIndicator({ status }: OrderStatusIndicatorProps) {
  const style = ORDER_STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", style.text)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
      {style.label}
    </span>
  );
}
