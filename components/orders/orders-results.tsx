import { getOrders } from "@/lib/api/orders";
import { OrdersTable, OrdersTableSkeleton } from "@/components/orders/orders-table";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
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
      <ResultsSummary total={total} page={page} pageSize={pageSize} />
      <OrdersTable orders={orders} />
      <Pagination page={page} pageSize={pageSize} total={total} pageSizeOptions={ORDER_PAGE_SIZE_OPTIONS} />
    </>
  );
}

// The one place on this page that states how many orders actually
// matched — Pagination's own "Page X of Y" says which page, never a real
// count. role="status" (same pattern SectionBoundary's role="alert"
// already uses — implicit ARIA semantics, no separate aria-live needed)
// means a screen-reader user typing in the debounced search hears the new
// count, or that nothing matched, without having to go find the table and
// count rows themselves. Visually hidden at total === 0: OrdersTable's own
// EmptyState already states the same thing for sighted users right below
// it — the announcement was the actual gap there, not the visible text.
function ResultsSummary({ total, page, pageSize }: { total: number; page: number; pageSize: number }) {
  if (total === 0) {
    return (
      <p role="status" className="sr-only">
        No orders match your filters.
      </p>
    );
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <p role="status" className="text-sm text-muted-foreground">
      Showing {start}–{end} of {total} order{total === 1 ? "" : "s"}
    </p>
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
// alongside it) depends on a total that hasn't been fetched yet. The
// summary line's shape doesn't have that problem — it's always exactly
// one line of text — so it gets a real placeholder (h-5 matching
// ResultsSummary's own text-sm line height, the same value OrdersTable's
// skeleton rows already use for text-sm content) rather than being
// omitted like Pagination.
export function OrdersResultsSkeleton({ pageSize }: OrdersResultsSkeletonProps) {
  return (
    <>
      <Skeleton className="h-5 w-40" />
      <OrdersTableSkeleton rowCount={pageSize} />
    </>
  );
}
