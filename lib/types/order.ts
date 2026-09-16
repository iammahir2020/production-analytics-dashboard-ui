export type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "cancelled"
  | "refunded";

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
