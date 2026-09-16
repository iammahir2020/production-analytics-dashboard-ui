import { endOfDay } from "date-fns";
import ordersData from "@/lib/data/mock-orders.json";
import type { Order, OrderFilters, PaginatedOrders } from "@/lib/types/order";
import { mockFetch } from "./client";

const orders = ordersData as Order[];
const DEFAULT_PAGE_SIZE = 10;

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
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : DEFAULT_PAGE_SIZE;
  const start = (page - 1) * pageSize;
  const paginatedOrders = sorted.slice(start, start + pageSize);

  return mockFetch({ orders: paginatedOrders, total, page, pageSize });
}

export async function getOrderById(id: string): Promise<Order | null> {
  const order = orders.find((o) => o.id === id) ?? null;
  return mockFetch(order);
}
