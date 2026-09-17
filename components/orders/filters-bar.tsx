"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useOrderFiltersUrl } from "@/hooks/use-order-filters";
import { DateRangeFilter } from "@/components/orders/date-range-filter";
import { ORDER_STATUS_STYLES } from "@/components/orders/order-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUSES } from "@/lib/types/order";

const SEARCH_DEBOUNCE_MS = 400;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_STYLES[status].label })),
];

// Only the free-text search is debounced — status/date changes are
// discrete "commit on change" interactions (one Select pick, one date
// pick), not a stream of keystrokes, so they update the URL immediately.
// Debouncing them too would just add a perceived-lag delay with nothing
// to actually protect against (plan.md calls out "the orders search box"
// specifically, not filters generally).
export function FiltersBar() {
  const { filters, setFilter, clearFilters, hasActiveFilters } = useOrderFiltersUrl();

  const [searchText, setSearchText] = useState(filters.q);

  // Resyncs local state when q changes for a reason OTHER than this
  // component's own debounced push below (Clear filters, browser back/
  // forward, a shared link). Adjusted during render, not in a useEffect —
  // React's own documented pattern for "reset state when a prop changes,"
  // and the same fix already used once in this project (hooks/use-
  // mounted.ts) after the set-state-in-effect lint rule caught a naive
  // version of this. `prevUrlSearch` tracks the last q value seen; when
  // it's our own push, filters.q converges to what searchText already
  // holds, so this becomes a same-value setState — React bails, and
  // normal typing never loses cursor position or focus.
  const [prevUrlSearch, setPrevUrlSearch] = useState(filters.q);
  if (filters.q !== prevUrlSearch) {
    setPrevUrlSearch(filters.q);
    setSearchText(filters.q);
  }

  const debouncedSearch = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);

  // Push the debounced value once typing pauses. router.replace is a real
  // external-system side effect (not a React state setter), so an effect
  // is the correct place for it — unlike the resync above.
  useEffect(() => {
    if (debouncedSearch !== filters.q) setFilter("q", debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    // Stacks one control per row below sm (640px) — at the page's actual
    // mobile padding (px-4, app/layout.tsx), the desktop row's fixed
    // widths (search min-w-50 + status w-40 + two w-37.5 dates + gaps)
    // sum to ~800px, nowhere close to fitting even wrapped without going
    // full-width per control first. sm:flex-wrap still lets the row wrap
    // at in-between widths rather than demanding all-or-nothing.
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:min-w-50 sm:flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search order id or customer…"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="pl-8"
          aria-label="Search orders"
        />
      </div>

      <Select value={filters.status} onValueChange={(value) => setFilter("status", value ?? "all")}>
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
          {/* SelectValue renders the raw value ("all", "pending", …) by
              default — it doesn't look up the matching SelectItem's label
              on its own. A children function is Base UI's documented way
              to map the value to what should actually display. */}
          <SelectValue>
            {(value: string) => STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* DateRangeFilter and Clear share one row at every breakpoint,
          rather than Clear being a top-level child of the outer flex-col —
          as a direct child it inherited flex-col's default align-items:
          stretch below sm, stretching Button's own box to the full row
          width with its content centered inside, which read as its own
          separate, oddly emphasized block instead of a small secondary
          action. Nesting it here keeps it compact and inline instead. */}
      <div className="flex items-center gap-2">
        <DateRangeFilter />
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
            <X className="size-3.5" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

export function FiltersBarSkeleton() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Skeleton className="h-8 w-full sm:min-w-50 sm:flex-1" />
      <Skeleton className="h-8 w-full sm:w-40" />
      <Skeleton className="h-8 w-full sm:w-44" />
    </div>
  );
}
