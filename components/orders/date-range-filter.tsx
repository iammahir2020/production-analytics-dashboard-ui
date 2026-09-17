"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useOrderFiltersUrl } from "@/hooks/use-order-filters";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseDateParam } from "@/lib/date-params";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function toUrlDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// Replaces the two native <input type="date"> fields with a single
// popover: one range-mode Calendar instead of two independent single-date
// inputs, since "from" and "to" are really one filter, not two — picking
// a range in one continuous interaction (start day, then end day) reads
// better than tabbing between two separate fields.
export function DateRangeFilter() {
  const { filters, setFilters } = useOrderFiltersUrl();
  const [open, setOpen] = useState(false);

  // Local, uncommitted selection while the popover is open — deliberately
  // NOT auto-committed to the URL on every click. react-day-picker's range
  // mode seeds a same-day range (`{from: day, to: day}`) on the very first
  // click (confirmed by reading its own addToRange source, not assumed) —
  // treating "both endpoints present" as "selection complete" closed the
  // popover after one click, before a real second endpoint could ever be
  // chosen. An explicit Apply button (below), the same pattern most real
  // date-range pickers use, sidesteps that ambiguity entirely: the user
  // decides when the selection is done, not a heuristic guessing at it.
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDateParam(filters.from),
    to: parseDateParam(filters.to),
  });

  // Resyncs the draft selection when the URL's from/to change for a
  // reason other than this component's own Apply/Clear below (the page's
  // "Clear" button, browser back/forward, a shared link) — adjusted
  // during render, the same pattern FiltersBar's search box already uses,
  // not a useEffect.
  const [prevUrlRange, setPrevUrlRange] = useState({ from: filters.from, to: filters.to });
  if (filters.from !== prevUrlRange.from || filters.to !== prevUrlRange.to) {
    setPrevUrlRange({ from: filters.from, to: filters.to });
    setRange({ from: parseDateParam(filters.from), to: parseDateParam(filters.to) });
  }

  // Reopening resyncs the draft to whatever's currently applied — closing
  // without applying (Escape, clicking outside) shouldn't leave a half-made
  // selection sitting there for next time.
  function handleOpenChange(next: boolean) {
    if (next) setRange({ from: parseDateParam(filters.from), to: parseDateParam(filters.to) });
    setOpen(next);
  }

  function handleApply() {
    setFilters({
      from: range?.from ? toUrlDate(range.from) : "",
      to: range?.to ? toUrlDate(range.to) : "",
    });
    setOpen(false);
  }

  function handleClear() {
    setRange(undefined);
    setFilters({ from: "", to: "" });
    setOpen(false);
  }

  const hasRange = filters.from !== "" || filters.to !== "";
  const hasDraft = range?.from !== undefined || range?.to !== undefined;
  const label =
    filters.from && filters.to
      ? `${formatDate(filters.from)} – ${formatDate(filters.to)}`
      : filters.from
        ? `From ${formatDate(filters.from)}`
        : filters.to
          ? `Until ${formatDate(filters.to)}`
          : "Date range";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              // shrink (not shrink-0) overrides Button's own base default —
              // this trigger needs to actually shrink so the "Clear" button
              // beside it (see filters-bar.tsx) has room, instead of
              // pushing it out of the row entirely.
              "min-w-0 w-full shrink justify-start gap-2 font-normal sm:w-auto",
              !hasRange && "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        {/* One month on mobile (a 2-month grid at 768px is wider than the
            viewport itself and would force the popover to scroll
            sideways), two from sm: (640px) up — the calendar's own
            content sets the popover's width, so this alone decides
            whether the popup fits without any extra media-query code. */}
        <Calendar
          mode="range"
          numberOfMonths={1}
          className="sm:hidden"
          selected={range}
          onSelect={setRange}
          defaultMonth={range?.from}
        />
        <Calendar
          mode="range"
          numberOfMonths={2}
          className="hidden sm:flex"
          selected={range}
          onSelect={setRange}
          defaultMonth={range?.from}
        />
        <div className="flex items-center justify-between gap-2 border-t border-grid-line p-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={!hasDraft}>
            <X className="size-3.5" aria-hidden="true" />
            Clear
          </Button>
          <Button type="button" size="sm" onClick={handleApply} disabled={!hasDraft}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
