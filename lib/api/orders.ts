import { cache } from "react";
import { endOfDay } from "date-fns";
import ordersData from "@/lib/data/mock-orders.json";
import type { Order, OrderFilters, PaginatedOrders } from "@/lib/types/order";
import { mockFetch } from "./client";

const orders = ordersData as Order[];
// Exported so OrdersTableSkeleton's fallback row count can't silently
// drift from the real default page size the way it did once already —
// found via a real loading-state measurement (see learn.md): the
// skeleton was showing 8 placeholder rows while an unfiltered request
// actually returns 10, a visible row-count jump on top of the height one.
export const DEFAULT_PAGE_SIZE = 10;

export async function getOrders(filters: OrderFilters = {}): Promise<PaginatedOrders> {
  let filtered = orders;

  const searchTerm = filters.search?.trim().toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(
      (order) =>
        order.id.toLowerCase().includes(searchTerm) ||
        order.customerName.toLowerCase().includes(searchTerm)
    );
  }

  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter((order) => order.status === filters.status);
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    filtered = filtered.filter((order) => new Date(order.createdAt) >= from);
  }

  if (filters.dateTo) {
    const to = endOfDay(new Date(filters.dateTo));
    filtered = filtered.filter((order) => new Date(order.createdAt) <= to);
  }

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = sorted.length;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : DEFAULT_PAGE_SIZE;
  // Clamped against the real page count, not just floored at 1 — an
  // out-of-range page (a stale bookmark, a hand-edited URL, or simply the
  // last page of a wider filter that just got narrower) would otherwise
  // slice past the end and return zero rows. OrdersTable then reports
  // that as "no orders match your filters," which is true of the slice
  // and false of the filters — the exact empty-vs-wrong-page confusion
  // step 50.2 already ruled out for empty-vs-error. Serving the nearest
  // real page instead, and returning the page actually used (below), keeps
  // both the data and the "Page X of Y" label honest.
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, filters.page ?? 1), totalPages);
  const start = (page - 1) * pageSize;
  const paginatedOrders = sorted.slice(start, start + pageSize);

  return mockFetch({ orders: paginatedOrders, total, page, pageSize });
}

// React.cache, not a plain function — /orders/[id]/page.tsx's own
// generateMetadata and its page component both need the same order for
// the same request (a title, and everything else), and neither one's
// mock API call goes through the real fetch() that Next already dedupes
// automatically. Without this, adding generateMetadata would have quietly
// doubled the lookup (and its artificial mockFetch delay) on every visit
// to this route — cache() shares one in-flight call across both within a
// single request instead.
export const getOrderById = cache(async (id: string): Promise<Order | null> => {
  const order = orders.find((o) => o.id === id) ?? null;
  return mockFetch(order);
});
