export type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "cancelled"
  | "refunded";

// The single source of truth for "every status, in order" — needed
// wherever code has to enumerate all of them (a status breakdown chart, a
// filter <Select>, validating a URL param) rather than just narrow one
// value. Was duplicated locally in two places (lib/api/analytics.ts,
// app/orders/page.tsx) before a third real need (the orders filter)
// crossed the point where that stopped making sense. `as const`, matching
// ORDER_PAGE_SIZE_OPTIONS below — this is read from, never mutated,
// anywhere it's used.
export const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled", "refunded"] as const;

export interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdAt: string;
}

// The one list of allowed "rows per page" choices — used both to populate
// the orders page's page-size <Select> and to validate an incoming
// `pageSize` URL param server-side, so the UI options and the validation
// can't drift apart into two separately-maintained lists.
export const ORDER_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type OrderPageSize = (typeof ORDER_PAGE_SIZE_OPTIONS)[number];

export interface OrderFilters {
  search?: string;
  status?: OrderStatus | "all";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedOrders {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
}
