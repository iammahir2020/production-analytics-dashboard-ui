export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  activeCustomers: number;
  conversionRate: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}
