import { eachDayOfInterval, endOfDay, format, startOfDay } from "date-fns";
import ordersData from "@/lib/data/mock-orders.json";
import analyticsData from "@/lib/data/mock-analytics.json";
import type { Order } from "@/lib/types/order";
import type { AnalyticsSummary, RevenuePoint } from "@/lib/types/analytics";
import { getActiveCustomerCount } from "./customers";
import { mockFetch } from "./client";

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

export async function getSummaryStats(): Promise<AnalyticsSummary> {
  // Already goes through its own mockFetch delay — awaiting it here rather
  // than wrapping this function's result in a second one avoids stacking
  // two artificial delays for a single dashboard stat.
  const activeCustomers = await getActiveCustomerCount();

  return {
    totalRevenue: sumRevenue(orders),
    totalOrders: orders.length,
    activeCustomers,
    // A fraction (e.g. 0.0348), not a percentage — display formatting
    // (multiplying by 100, appending "%") is the presentation layer's job.
    conversionRate: round(orders.length / analyticsData.totalVisitors, 4),
  };
}

export async function getRevenueTimeseries(): Promise<RevenuePoint[]> {
  const orderTimestamps = orders.map((order) => new Date(order.createdAt).getTime());
  const start = startOfDay(new Date(Math.min(...orderTimestamps)));
  const end = startOfDay(new Date(Math.max(...orderTimestamps)));

  const points: RevenuePoint[] = eachDayOfInterval({ start, end }).map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const dayOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= dayStart && createdAt <= dayEnd;
    });

    return {
      date: format(day, "yyyy-MM-dd"),
      revenue: sumRevenue(dayOrders),
      orders: dayOrders.length,
    };
  });

  return mockFetch(points);
}
