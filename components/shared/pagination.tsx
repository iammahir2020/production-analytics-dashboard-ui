"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Rows-per-page choices to offer, e.g. [10, 20, 50]. Omit to render
   * plain Prev/Next pagination with no page-size control — kept optional,
   * not folded into `pageSize` itself, so a caller that only paginates
   * (no size choice) doesn't have to opt out of anything. */
  pageSizeOptions?: readonly number[];
}

// Reusable beyond the orders page on purpose: reads/writes only the
// `page`/`pageSize` URL params via its own usePathname()/useSearchParams(),
// with no dependency on useOrderFiltersUrl — any future page that
// paginates through a `page` param (with or without a size choice) can
// drop this in as-is. "Page X of Y" + Prev/Next rather than numbered page
// buttons — with up to 20 pages at the default size, a numbered pager
// would need ellipsis handling for little real benefit; knowing where you
// are and moving one step either way is the actually useful interaction.
export function Pagination({ page, pageSize, total, pageSizeOptions }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasMultiplePages = totalPages > 1;

  // Nothing at all to control: a single page and no size choice offered.
  // total === 0 also renders nothing — a page-size choice for zero rows
  // has nothing to act on and would just be confusing next to an empty
  // state that already offers its own "Clear filters" action.
  if (total === 0 || (!hasMultiplePages && !pageSizeOptions)) return null;

  function goToPage(target: number) {
    const params = new URLSearchParams(searchParams);
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Changing the page size resets to page 1 — staying on, say, page 5 of
  // a 10-per-page view after switching to 50-per-page could land past the
  // end of the new, shorter page count.
  function changePageSize(nextSize: string) {
    const params = new URLSearchParams(searchParams);
    params.set("pageSize", nextSize);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {hasMultiplePages && (
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        )}
        {pageSizeOptions && (
          <div className="flex items-center gap-1.5">
            <label htmlFor="orders-page-size" className="text-sm text-muted-foreground">
              Rows
            </label>
            <Select value={String(pageSize)} onValueChange={(value) => value && changePageSize(value)}>
              <SelectTrigger id="orders-page-size" size="sm" className="w-18" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {hasMultiplePages && (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
