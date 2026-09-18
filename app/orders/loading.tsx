import { FiltersBarSkeleton } from "@/components/orders/filters-bar";
import { OrdersTableSkeleton } from "@/components/orders/orders-table";
import { Skeleton } from "@/components/ui/skeleton";

// Route-level loading UI — shown while navigating to /orders, before
// page.tsx's own Server Component has resolved. No Pagination skeleton:
// its final page count depends on the fetch that hasn't happened yet, so
// there's nothing honest to draw a placeholder for. The results-summary
// line ("Showing X–Y of Z orders") doesn't have that problem — its shape
// is always exactly one line of text — so it gets a real placeholder
// here too, matching OrdersResultsSkeleton's own h-5 line exactly; this
// file and that one shadow the same real layout at two different moments
// (first navigation vs. a filter-triggered refetch) and would otherwise
// drift out of sync with each other.
export default function OrdersLoading() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Orders</h1>
      <FiltersBarSkeleton />
      <Skeleton className="h-5 w-40" />
      <OrdersTableSkeleton />
    </div>
  );
}
