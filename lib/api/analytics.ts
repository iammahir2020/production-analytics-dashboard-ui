import { eachDayOfInterval, endOfDay, format, startOfDay, subDays } from "date-fns";
import ordersData from "@/lib/data/mock-orders.json";
import analyticsData from "@/lib/data/mock-analytics.json";
import { ORDER_STATUSES, type Order } from "@/lib/types/order";
import type { AnalyticsSummary, PeriodDelta, RevenuePoint, StatusBreakdownPoint, TopProduct } from "@/lib/types/analytics";
import { getActiveCustomerCount } from "./customers";
import { mockFetch } from "./client";

const TREND_WINDOW_DAYS = 30;
const TOP_PRODUCTS_LIMIT = 5;

const orders = ordersData as Order[];

// Orders that count as revenue: payment is captured at order time, so
// pending/processing/completed count, cancelled/refunded don't. Same rule
// used for Customer.totalSpent in the mock-data generator (step 7), kept
// in sync here rather than redecided.
const SPENT_STATUSES = new Set<Order["status"]>(["pending", "processing", "completed"]);

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sumRevenue(forOrders: Order[]): number {
  return round(
    forOrders.filter((order) => SPENT_STATUSES.has(order.status)).reduce((sum, order) => sum + order.total, 0),
    2
  );
}

function ordersBetween(start: Date, end: Date): Order[] {
  return orders.filter((order) => {
    const createdAt = new Date(order.createdAt);
    return createdAt >= start && createdAt <= end;
  });
}

// Shared by getSummaryStats (last TREND_WINDOW_DAYS, for the sparkline)
// and getRevenueTimeseries (the full order date range) — both are "one
// point per day between two dates," they just disagree on which two dates.
function bucketByDay(start: Date, end: Date): RevenuePoint[] {
  return eachDayOfInterval({ start, end }).map((day) => {
    const dayOrders = ordersBetween(startOfDay(day), endOfDay(day));
    return {
      date: format(day, "yyyy-MM-dd"),
      revenue: sumRevenue(dayOrders),
      orders: dayOrders.length,
    };
  });
}

// Percent change vs the prior period, as a signed fraction. previous === 0
// can't be divided into — treated as "up" if the current period has any
// activity at all, "flat" if both periods are genuinely zero, rather than
// producing Infinity/NaN.
function periodDelta(current: number, previous: number): PeriodDelta {
  if (previous === 0) {
    return current > 0 ? { changeFraction: 1, direction: "up" } : { changeFraction: 0, direction: "flat" };
  }
  const changeFraction = round((current - previous) / previous, 4);
  return {
    changeFraction,
    direction: changeFraction > 0 ? "up" : changeFraction < 0 ? "down" : "flat",
  };
}

export async function getSummaryStats(): Promise<AnalyticsSummary> {
  // Already goes through its own mockFetch delay — awaiting it here rather
  // than wrapping this function's result in a second one avoids stacking
  // two artificial delays for a single dashboard stat.
  const activeCustomers = await getActiveCustomerCount();

  // Anchored on the latest order's timestamp rather than `Date.now()` —
  // the mock dataset was generated for a fixed ~90-day window, so anchoring
  // on real wall-clock time would silently drift the "trailing 30 days"
  // window away from where the data actually is as time passes.
  const timestamps = orders.map((order) => new Date(order.createdAt).getTime());
  const latest = startOfDay(new Date(Math.max(...timestamps)));

  const currentStart = subDays(latest, TREND_WINDOW_DAYS - 1);
  const previousEnd = subDays(currentStart, 1);
  const previousStart = subDays(previousEnd, TREND_WINDOW_DAYS - 1);

  const currentPeriod = ordersBetween(currentStart, endOfDay(latest));
  const previousPeriod = ordersBetween(startOfDay(previousStart), endOfDay(previousEnd));

  const revenueSparkline = bucketByDay(currentStart, latest).map((point) => point.revenue);

  const totalRevenue = sumRevenue(orders);
  // Divided by revenue-*generating* orders, not every order — roughly a
  // quarter of orders are cancelled/refunded and contribute 0 to
  // totalRevenue, so dividing by orders.length would understate AOV
  // rather than answer "how much does a completed sale average."
  const spentOrders = orders.filter((order) => SPENT_STATUSES.has(order.status));
  const averageOrderValue = spentOrders.length > 0 ? round(totalRevenue / spentOrders.length, 2) : 0;

  return {
    totalRevenue,
    totalOrders: orders.length,
    activeCustomers,
    // A fraction (e.g. 0.0348), not a percentage — display formatting
    // (multiplying by 100, appending "%") is the presentation layer's job.
    conversionRate: round(orders.length / analyticsData.totalVisitors, 4),
    averageOrderValue,
    revenueDelta: periodDelta(sumRevenue(currentPeriod), sumRevenue(previousPeriod)),
    ordersDelta: periodDelta(currentPeriod.length, previousPeriod.length),
    revenueSparkline,
  };
}

export async function getRevenueTimeseries(): Promise<RevenuePoint[]> {
  const orderTimestamps = orders.map((order) => new Date(order.createdAt).getTime());
  const start = startOfDay(new Date(Math.min(...orderTimestamps)));
  const end = startOfDay(new Date(Math.max(...orderTimestamps)));

  return mockFetch(bucketByDay(start, end));
}

// All 5 statuses always present (even at count 0) — see ORDER_STATUSES.
export async function getOrderStatusBreakdown(): Promise<StatusBreakdownPoint[]> {
  const breakdown = ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  }));
  return mockFetch(breakdown);
}

// Aggregates order.items[] by product — fetched by every order already,
// but never summed anywhere until now. Spent-status orders only, matching
// how totalRevenue itself is defined, so "top products by revenue" and
// "total revenue" agree with each other on what counts as a sale.
export async function getTopProducts(limit: number = TOP_PRODUCTS_LIMIT): Promise<TopProduct[]> {
  const byProduct = new Map<string, { revenue: number; unitsSold: number }>();

  for (const order of orders) {
    if (!SPENT_STATUSES.has(order.status)) continue;
    for (const item of order.items) {
      const existing = byProduct.get(item.productName) ?? { revenue: 0, unitsSold: 0 };
      existing.revenue += item.quantity * item.unitPrice;
      existing.unitsSold += item.quantity;
      byProduct.set(item.productName, existing);
    }
  }

  const topProducts = Array.from(byProduct.entries())
    .map(([productName, stats]) => ({ productName, revenue: round(stats.revenue, 2), unitsSold: stats.unitsSold }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  return mockFetch(topProducts);
}
