import { format, formatDistanceToNow } from "date-fns";

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

// Neither `en-BD`/`en-US` (falls back to the "BDT" code — no ৳ glyph in
// their ICU data) nor plain `bn-BD` (has the glyph, but converts digits to
// Bengali numerals too) give the conventional look. Forcing
// `numberingSystem: "latn"` on `bn-BD` gets both things real Bangladeshi
// apps (bKash, Daraz BD) actually do: lakh-style grouping (45,59,700, not
// the Western 4,559,700) with ordinary Western digits. The ৳ symbol itself
// still isn't in this locale's currency data, so it's prepended directly
// rather than using Intl's `style: "currency"`.
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat("bn-BD", {
    numberingSystem: "latn",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `৳${formatted}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(value: string | Date): string {
  return format(toDate(value), "MMM d, yyyy");
}

// "MMM d" (no year) — was inlined identically in both chart tick
// formatters plus the ledger's date column (Phase 2b); extracted once a
// third call site made it a real duplicate rather than a guess at reuse.
export function formatShortDate(value: string | Date): string {
  return format(toDate(value), "MMM d");
}

// Chart-axis-only: "৳1.5L" rather than a full lakh-grouped figure — an
// axis label needs to be short, not exact. Not used anywhere numbers are
// read as a precise amount (those stay on formatCurrency).
export function formatCurrencyCompact(amount: number): string {
  if (amount === 0) return "৳0";
  const lakh = amount / 100000;
  const rounded = Math.round(lakh * 10) / 10;
  return `৳${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}L`;
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "MMM d, yyyy, h:mm a");
}

export function formatRelativeTime(value: string | Date): string {
  return formatDistanceToNow(toDate(value), { addSuffix: true });
}
