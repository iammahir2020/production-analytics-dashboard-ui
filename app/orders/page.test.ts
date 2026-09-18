import { parseFilters } from "@/app/orders/page";

describe("parseFilters", () => {
  it("passes a valid status, page, pageSize, and search term through unchanged", () => {
    const filters = parseFilters({ q: "ord_1", status: "completed", page: "2", pageSize: "20" });
    expect(filters).toEqual({
      search: "ord_1",
      status: "completed",
      dateFrom: undefined,
      dateTo: undefined,
      page: 2,
      pageSize: 20,
    });
  });

  it("falls back an unknown status to 'all', the same way a missing one does", () => {
    expect(parseFilters({ status: "bogus" }).status).toBe("all");
    expect(parseFilters({}).status).toBe("all");
  });

  it("falls back a pageSize outside the offered choices to undefined, not the nearest one", () => {
    // ORDER_PAGE_SIZE_OPTIONS is [10, 20, 50] — 999 isn't a UI choice, and
    // a hand-edited URL shouldn't be able to request an arbitrary page size.
    expect(parseFilters({ pageSize: "999" }).pageSize).toBeUndefined();
  });

  it("drops a fractional page instead of letting it produce an offset slice", () => {
    // The exact bug this check exists to prevent: ?page=1.5 used to reach
    // getOrders() as-is, where (page - 1) * pageSize produced a
    // fractional, non-page-aligned slice offset.
    expect(parseFilters({ page: "1.5" }).page).toBeUndefined();
  });

  it("drops a non-positive page", () => {
    expect(parseFilters({ page: "0" }).page).toBeUndefined();
    expect(parseFilters({ page: "-5" }).page).toBeUndefined();
  });

  it("lets a too-high but valid integer page through unchanged — getOrders(), not this function, clamps it", () => {
    expect(parseFilters({ page: "999" }).page).toBe(999);
  });

  it("drops an unparsable date instead of letting it reach date-fns as an Invalid Date", () => {
    // The exact crash this check exists to prevent — see this file's own
    // comment above parseFilters.
    const filters = parseFilters({ from: "banana", to: "2026-01-15" });
    expect(filters.dateFrom).toBeUndefined();
    expect(filters.dateTo).toBe("2026-01-15");
  });

  it("reads the first value when a param repeats in the URL", () => {
    // searchParams gives an array for a repeated key (?status=a&status=b) —
    // the same shape App Router hands every page for any param.
    expect(parseFilters({ status: ["completed", "pending"] }).status).toBe("completed");
  });
});
