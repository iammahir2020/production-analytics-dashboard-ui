import { formatCurrency, formatCurrencyCompact, formatDate, formatDateTime, formatShortDate, formatSignedCurrency } from "@/lib/format";

// Scope: the currency and date formatters with real branching logic —
// exactly what step.md's Phase 5 names ("currency, date"). formatPercent
// is a one-line Intl passthrough with no branch to get wrong, and
// formatRelativeTime reads the real wall clock (would need faking
// Date.now for no real assertion value) — both skipped deliberately, not
// missed. `npm test` runs with TZ=UTC (see package.json) specifically so
// these date assertions don't depend on whichever timezone happens to
// run the suite — date-fns' `format()` renders in the local timezone by
// default.
describe("formatCurrency", () => {
  it("prepends the Taka sign and always shows two decimals", () => {
    expect(formatCurrency(0)).toBe("৳0.00");
    expect(formatCurrency(2600)).toBe("৳2,600.00");
  });

  it("groups digits lakh-style (2s after the first 3), not Western 3s", () => {
    // 45,59,700 — not the Western 4,559,700 — is the whole reason this
    // formatter exists instead of a plain Intl currency formatter.
    expect(formatCurrency(4559700)).toBe("৳45,59,700.00");
  });
});

describe("formatSignedCurrency", () => {
  it("passes a positive amount through to formatCurrency unchanged", () => {
    expect(formatSignedCurrency(2600, false)).toBe(formatCurrency(2600));
  });

  it("parenthesizes a negative amount instead of using a minus sign", () => {
    expect(formatSignedCurrency(2600, true)).toBe("(৳2,600.00)");
  });
});

describe("formatCurrencyCompact", () => {
  it("renders zero as a plain ৳0, not ৳0.0L", () => {
    expect(formatCurrencyCompact(0)).toBe("৳0");
  });

  it("drops the decimal for a whole number of lakh", () => {
    expect(formatCurrencyCompact(100000)).toBe("৳1L");
  });

  it("keeps one decimal for a fractional lakh", () => {
    expect(formatCurrencyCompact(150000)).toBe("৳1.5L");
    expect(formatCurrencyCompact(50000)).toBe("৳0.5L");
  });

  it("rounds to the nearest tenth of a lakh", () => {
    // 125,000 / 100,000 = 1.25 -> rounds to 1.3, not 1.2 or 1.25
    expect(formatCurrencyCompact(125000)).toBe("৳1.3L");
  });
});

describe("formatDate / formatShortDate / formatDateTime", () => {
  const value = "2026-06-18T16:51:20.113Z";

  it("formatDate includes the year", () => {
    expect(formatDate(value)).toBe("Jun 18, 2026");
  });

  it("formatShortDate omits the year", () => {
    expect(formatShortDate(value)).toBe("Jun 18");
  });

  it("formatDateTime includes a 12-hour time", () => {
    expect(formatDateTime(value)).toBe("Jun 18, 2026, 4:51 PM");
  });

  it("accepts a Date object the same as an ISO string", () => {
    expect(formatDate(new Date(value))).toBe(formatDate(value));
  });
});
