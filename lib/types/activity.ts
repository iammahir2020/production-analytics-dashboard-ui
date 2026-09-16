export type ActivityType =
  | "order_created"
  | "order_status_changed"
  | "customer_registered"
  | "refund_issued";

export interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
  relatedOrderId?: string;
}
