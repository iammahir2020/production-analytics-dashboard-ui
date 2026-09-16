import { format, formatDistanceToNow } from "date-fns";

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

// Neither `en-BD`/`en-US` (falls back to the "BDT" code — no ৳ glyph in
// their ICU data) nor `bn-BD` (has the glyph, but converts digits to
// Bengali numerals too — inconsistent next to an English-language UI) give
// the conventional look. Real Bangladesh apps (bKash, Daraz BD) use ৳ with
// Western digits, so that's built directly rather than left to Intl's
// currency style.
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
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

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "MMM d, yyyy, h:mm a");
}

export function formatRelativeTime(value: string | Date): string {
  return formatDistanceToNow(toDate(value), { addSuffix: true });
}
