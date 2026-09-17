import { getOrders } from "@/lib/api/orders";
import { OrdersTable, OrdersTableSkeleton } from "@/components/orders/orders-table";
import { Pagination } from "@/components/shared/pagination";
import { ORDER_PAGE_SIZE_OPTIONS, type OrderFilters } from "@/lib/types/order";

interface OrdersResultsProps {
  filters: OrderFilters;
}

// Split out from app/orders/page.tsx specifically so FiltersBar can stay
// outside this boundary — without it, every filter change (a debounced
// search push, a status pick, a page click) had no boundary narrower than
// the whole route, so app/orders/loading.tsx's fallback replaced the
// entire page, FiltersBar included: the real inputs the user was just
// typing into unmounted, a skeleton flashed, then fresh inputs remounted.
// That's the "clunky" report, not just raw fetch latency. Now only this
// (the actual data dependency) suspends; the filters never do.
export async function OrdersResults({ filters }: OrdersResultsProps) {
  const { orders, total, page, pageSize } = await getOrders(filters);

  return (
    <>
      <OrdersTable orders={orders} />
      <Pagination page={page} pageSize={pageSize} total={total} pageSizeOptions={ORDER_PAGE_SIZE_OPTIONS} />
    </>
  );
}

interface OrdersResultsSkeletonProps {
  /** The requested page size, if any — known from the URL before the
   * fetch resolves, so the skeleton can show roughly the right row count
   * instead of a fixed one that would jump in height once real content
   * streams in. */
  pageSize?: number;
}

// No Pagination placeholder — same reasoning as app/orders/loading.tsx:
// its shape (page count, whether a size choice even needs pagination
// alongside it) depends on a total that hasn't been fetched yet.
export function OrdersResultsSkeleton({ pageSize }: OrdersResultsSkeletonProps) {
  return <OrdersTableSkeleton rowCount={pageSize} />;
}
