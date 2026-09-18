import { Suspense } from "react";
import { FiltersBar } from "@/components/orders/filters-bar";
import { OrdersResults, OrdersResultsSkeleton } from "@/components/orders/orders-results";
import { SectionBoundary } from "@/components/shared/section-boundary";
import { sanitizeDateParam } from "@/lib/date-params";
import { ORDER_PAGE_SIZE_OPTIONS, ORDER_STATUSES, type OrderFilters, type OrderStatus } from "@/lib/types/order";

// Same reasoning as the dashboard (app/page.tsx): getOrders() goes through
// the simulated mockFetch delay, and different searchParams need different
// data anyway — this route can't be meaningfully static-prerendered at all.
export const dynamic = "force-dynamic";

// Every param is validated rather than cast blindly — a mistyped or
// hand-edited query string should fall back to a sane default, not
// silently produce a filter that matches nothing. `status` is checked
// against the closed OrderStatus enum, `pageSize` against the one closed
// list of choices the UI actually offers (ORDER_PAGE_SIZE_OPTIONS, so a
// hand-edited URL can't request an arbitrary huge page), and `from`/`to`
// through the shared parseDateParam. `page` requires a whole number, not
// just a finite one — `?page=1.5` used to pass a bare `Number.isFinite`
// check and reach getOrders() as-is, where `(page - 1) * pageSize`
// produced a fractional slice offset (a real, non-page-aligned 10-row
// window straddling two pages). No UI control can ever produce a
// fractional page, so this is the same "malformed → sane default"
// treatment as an unknown status, not a new rule. An in-range integer
// that's simply too high (`?page=999`) is deliberately let through here
// — getOrders() is where the real page count is known, and that's where
// it gets clamped instead of rejected.
//
// The date check was added later, in the task-PDF audit. The comment here
// used to argue it was unnecessary because FiltersBar's
// <input type="date"> could only ever produce well-formed values — which
// stopped being true when the Calendar replaced that input, and was never
// true of URLs people edit or share. Unvalidated, `?from=banana` reached
// date-fns' format() as an Invalid Date and threw, taking the whole page
// down. Left as a note rather than quietly corrected: a stale "why this
// is safe" comment is worth more as a warning than deleted.
//
// Exported for app/orders/page.test.ts — this validation logic is exactly
// the kind of thing worth unit-testing directly (every malformed-input
// case at once) rather than only indirectly, through whatever a real
// request happens to hit. Next.js doesn't treat this as a special
// page-file export the way `default`/`dynamic`/`generateMetadata` are —
// it's an ordinary named export, ignored by the router, importable by
// anything else in the same way a plain utility module's would be.
export function parseFilters(searchParams: Record<string, string | string[] | undefined>): OrderFilters {
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
    dateFrom: sanitizeDateParam(get("from")),
    dateTo: sanitizeDateParam(get("to")),
    page: Number.isInteger(page) && page > 0 ? page : undefined,
    pageSize: (ORDER_PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize) ? pageSize : undefined,
  };
}

// FiltersBar sits outside the Suspense boundary on purpose: it doesn't
// depend on server data at all (only the URL), so it must never be part
// of what suspends *or errors*. OrdersResults is the page's one real data
// dependency (the filtered order list) and gets both a Suspense boundary
// (for loading) and a SectionBoundary (for errors) — the same pairing
// the dashboard already uses for each of its sections. The SectionBoundary
// matters on its own, separately from Suspense: a thrown error propagates
// past a Suspense boundary to the nearest *error* boundary regardless —
// without one scoped here, an OrdersResults failure would still reach
// app/orders/error.tsx and take FiltersBar down with it, exactly the
// "clunky filter" disruption this same file already fixed for the loading
// case. Confirmed directly (not assumed): before this boundary existed,
// forcing getOrders() to fail replaced the entire page, search box and
// all, with the route-level error card. app/orders/error.tsx still exists
// as the last-resort catch-all for anything outside OrdersResults (a
// genuinely unexpected render error elsewhere on the page), and
// loading.tsx still covers the first navigation into /orders, before
// anything is mounted yet.
export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const filters = parseFilters(await searchParams);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Orders</h1>
      <FiltersBar />
      <Suspense fallback={<OrdersResultsSkeleton pageSize={filters.pageSize} />}>
        <SectionBoundary label="Orders">
          <OrdersResults filters={filters} />
        </SectionBoundary>
      </Suspense>
    </div>
  );
}
