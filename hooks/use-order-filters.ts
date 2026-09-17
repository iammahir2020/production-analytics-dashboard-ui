"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types/order";

export interface OrderFiltersState {
  q: string;
  status: OrderStatus | "all";
  from: string;
  to: string;
}

// One shared owner for reading/writing the orders page's URL filter
// state — used by FiltersBar (the inputs themselves) and by OrdersTable's
// empty state (the "Clear filters" button), so the URLSearchParams
// manipulation exists in exactly one place rather than being redone
// per-consumer. Deliberately separate from Pagination's own URL handling —
// Pagination only ever touches `page` and stays generic/reusable, with no
// dependency on this orders-specific hook.
export function useOrderFiltersUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawStatus = searchParams.get("status");
  const filters: OrderFiltersState = {
    q: searchParams.get("q") ?? "",
    status: rawStatus && ORDER_STATUSES.includes(rawStatus as OrderStatus) ? (rawStatus as OrderStatus) : "all",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  };

  // replace, not push — a filter tweak or page change shouldn't add a new
  // browser-history entry; the back button should return to wherever the
  // user was *before* landing on /orders, not walk back through every
  // intermediate filter combination. scroll: false avoids the page
  // jumping to the top on every keystroke-driven update.
  //
  // setFilters (plural) exists so a date-range pick can set `from` and
  // `to` in one router.replace — calling setFilter twice in the same
  // handler would silently lose the first change, since both calls close
  // over the same pre-update `searchParams` snapshot and the second
  // replace's fresh URLSearchParams wouldn't know about the first's
  // edit. setFilter is now a thin wrapper so the two can't drift apart.
  const setFilters = useCallback(
    (updates: Partial<Record<keyof OrderFiltersState, string>>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all") params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const setFilter = useCallback(
    (key: keyof OrderFiltersState, value: string) => setFilters({ [key]: value }),
    [setFilters]
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActiveFilters = filters.q !== "" || filters.status !== "all" || filters.from !== "" || filters.to !== "";

  return { filters, setFilter, setFilters, clearFilters, hasActiveFilters };
}
