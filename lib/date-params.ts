/**
 * Parsing for the `from`/`to` date query params, shared by the three
 * places that read them: the orders page's server-side `parseFilters`,
 * the `useOrderFiltersUrl` hook, and `DateRangeFilter` itself.
 *
 * A query string is user input — hand-edited, pasted from chat, or a
 * stale bookmark — so a value here can be anything, not just what the
 * date picker last wrote. `?from=banana` used to reach date-fns'
 * `format()` as an Invalid Date and throw `RangeError: Invalid time
 * value`, which took down the whole orders page (filters included) with
 * no way to recover, since the bad param stayed in the URL through every
 * retry.
 */

/** A well-formed value the app itself would have written: `yyyy-MM-dd`. */
const URL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns the parsed Date, or `undefined` for anything malformed.
 *
 * Both checks are needed: the pattern alone accepts `2026-13-45`, and
 * `Date.parse` alone accepts plenty this app never writes (`"Dec 2026"`,
 * full ISO timestamps), which would then round-trip back into the URL in
 * a shape the picker can't round-trip again.
 *
 * Parsed at midday, not midnight — a `yyyy-MM-dd` string parses as UTC,
 * so midnight shifts back a day when formatted in any timezone west of
 * UTC (Bangladesh is UTC+6, but a reviewer opening the deployed link
 * from the US would see the wrong date).
 */
export function parseDateParam(value: string | undefined | null): Date | undefined {
  if (!value || !URL_DATE_PATTERN.test(value)) return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** The raw param, kept only if it's actually usable — for the callers that
 * pass the string onward (the service layer's filters) rather than the Date. */
export function sanitizeDateParam(value: string | undefined | null): string | undefined {
  return parseDateParam(value) ? value ?? undefined : undefined;
}
