import { Suspense } from "react";
import { FiltersBar } from "@/components/orders/filters-bar";
import { OrdersResults, OrdersResultsSkeleton } from "@/components/orders/orders-results";
import { ORDER_PAGE_SIZE_OPTIONS, ORDER_STATUSES, type OrderFilters, type OrderStatus } from "@/lib/types/order";

// Same reasoning as the dashboard (app/page.tsx): getOrders() goes through
// the simulated mockFetch delay, and different searchParams need different
// data anyway — this route can't be meaningfully static-prerendered at all.
export const dynamic = "force-dynamic";

// Validated against the closed OrderStatus enum rather than cast blindly —
// a mistyped or hand-edited query string should fall back to "all", not
// silently produce a filter that matches nothing. Date params aren't
// validated: FiltersBar's <input type="date"> always produces well-formed
// values, so there's no real source of malformed ones to guard against.
// pageSize is validated the same way status is — against the one closed
// list of offered choices (ORDER_PAGE_SIZE_OPTIONS) — so a hand-edited
// URL can't request some arbitrary huge page size the UI never offered.
function parseFilters(searchParams: Record<string, string | string[] | undefined>): OrderFilters {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const status = get("status");
  const page = Number(get("page"));
  const pageSize = Number(get("pageSize"));

  return {
    search: get("q"),
    status: status && ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : "all",
    dateFrom: get("from"),
    dateTo: get("to"),
    page: Number.isFinite(page) && page > 0 ? page : undefined,
    pageSize: (ORDER_PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize) ? pageSize : undefined,
  };
}

// FiltersBar sits outside the Suspense boundary on purpose: it doesn't
// depend on server data at all (only the URL), so it must never be part
// of what suspends. OrdersResults is the page's one real data dependency
// (the filtered order list) and gets exactly one boundary around it —
// still "sections follow data dependencies," just narrower than it first
// looked: the dependency is the results, not the whole page. error.tsx
// still covers the whole route (an error thrown inside OrdersResults
// still propagates up to the nearest error boundary regardless of the
// Suspense boundary in between), and loading.tsx still covers the first
// navigation into /orders, before anything is mounted yet.
export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const filters = parseFilters(await searchParams);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Orders</h1>
      <FiltersBar />
      <Suspense fallback={<OrdersResultsSkeleton pageSize={filters.pageSize} />}>
        <OrdersResults filters={filters} />
      </Suspense>
    </div>
  );
}
