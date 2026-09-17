import { OrderDetailsViewSkeleton } from "@/components/orders/order-details-view";

// Route-level loading UI — shown while navigating to /orders/[id],
// before page.tsx's Server Component (order + customer + activity, all
// fetched before anything renders) has resolved.
export default function OrderDetailsLoading() {
  return <OrderDetailsViewSkeleton />;
}
