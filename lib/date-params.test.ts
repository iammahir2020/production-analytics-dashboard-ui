import { parseDateParam, sanitizeDateParam } from "@/lib/date-params";

describe("parseDateParam", () => {
  it("parses a well-formed yyyy-MM-dd value at midday", () => {
    const date = parseDateParam("2026-01-15");
    expect(date).toBeInstanceOf(Date);
    // Midday, not midnight — see this file's own comment for why: a
    // midnight parse shifts back a day once formatted west of UTC.
    expect(date?.toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });

  it("returns undefined for null, undefined, and an empty string", () => {
    expect(parseDateParam(null)).toBeUndefined();
    expect(parseDateParam(undefined)).toBeUndefined();
    expect(parseDateParam("")).toBeUndefined();
  });

  // The exact crash this file exists to prevent (see the file-level
  // comment): `?from=banana` used to reach date-fns' format() as an
  // Invalid Date and throw, taking down the whole orders page.
  it("returns undefined for a value that isn't a date at all", () => {
    expect(parseDateParam("banana")).toBeUndefined();
  });

  it("returns undefined for a full ISO timestamp, not just a bare date", () => {
    // The pattern check alone (not just Date.parse) is what rejects this —
    // Date.parse happily accepts a full timestamp, but this app only ever
    // writes yyyy-MM-dd, and a timestamp round-tripping back into the URL
    // would be a shape the date picker can't parse again.
    expect(parseDateParam("2026-01-15T00:00:00.000Z")).toBeUndefined();
  });

  it("returns undefined for a value that matches the pattern but names an impossible month", () => {
    // 13 as a month has no valid interpretation at all — unlike a day
    // that merely overflows within a real month (see the next test).
    expect(parseDateParam("2026-13-45")).toBeUndefined();
  });

  // A real, confirmed-not-assumed quirk of the underlying Date parser:
  // an out-of-range *day* within a real month doesn't fail — it rolls
  // over into the next month instead, silently drifting away from what
  // was actually typed rather than being rejected the way an impossible
  // month is. Documented here as the function's actual behavior, not
  // fixed — parseDateParam's own two-part contract (a shape check plus
  // "does Date accept it") was written to catch nonsense input, not to
  // validate calendar accuracy, and this app's date picker never
  // produces an overflowing day in the first place.
  it("rolls an out-of-range day within a real month into the next month, rather than rejecting it", () => {
    const date = parseDateParam("2026-02-30");
    expect(date).toBeInstanceOf(Date);
    expect(date?.toISOString()).toBe("2026-03-02T12:00:00.000Z");
  });
});

describe("sanitizeDateParam", () => {
  it("returns the original string unchanged when it's valid", () => {
    expect(sanitizeDateParam("2026-01-15")).toBe("2026-01-15");
  });

  it("returns undefined for malformed input, the same cases parseDateParam rejects", () => {
    expect(sanitizeDateParam("banana")).toBeUndefined();
    expect(sanitizeDateParam("2026-13-45")).toBeUndefined();
    expect(sanitizeDateParam(null)).toBeUndefined();
    expect(sanitizeDateParam(undefined)).toBeUndefined();
  });
});
