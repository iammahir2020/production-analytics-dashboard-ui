import type { OrderStatus } from "./order";

// A real trailing-30-vs-prior-30-day comparison — not shown for
// activeCustomers or conversionRate, because the mock dataset has no
// per-period join tracking or per-period visitor counts to compute a real
// delta from. Fabricating one there would violate the direction's own
// rule against invented trend data (.interface-design/system.md).
export interface PeriodDelta {
  changeFraction: number;
  direction: "up" | "down" | "flat";
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  activeCustomers: number;
  conversionRate: number;
  // Revenue ÷ revenue-generating orders — see getSummaryStats() for why
  // that denominator, not totalOrders.
  averageOrderValue: number;
  revenueDelta: PeriodDelta;
  ordersDelta: PeriodDelta;
  // Last 30 days of daily revenue, for the hero KPI tile's sparkline —
  // piggybacks on the same day-bucketing getSummaryStats already needs
  // for revenueDelta, rather than SummaryCards making a second fetch.
  revenueSparkline: number[];
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

// Phase 2c — dashboard richness (Tier A), see plan.md.
export interface StatusBreakdownPoint {
  status: OrderStatus;
  count: number;
}

export interface TopProduct {
  productName: string;
  revenue: number;
  unitsSold: number;
}
