import { FiltersBarSkeleton } from "@/components/orders/filters-bar";
import { OrdersTableSkeleton } from "@/components/orders/orders-table";

// Route-level loading UI — shown while navigating to /orders, before
// page.tsx's own Server Component has resolved. No Pagination skeleton:
// its final page count depends on the fetch that hasn't happened yet, so
// there's nothing honest to draw a placeholder for.
export default function OrdersLoading() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Orders</h1>
      <FiltersBarSkeleton />
      <OrdersTableSkeleton />
    </div>
  );
}
