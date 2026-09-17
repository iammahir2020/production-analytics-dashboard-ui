import { ApiError, mockFetch } from "@/lib/api/client";

// delayMs is always passed explicitly here for determinism — every real
// caller in this app (lib/api/*.ts) omits it and gets the actual random
// 1–2000ms delay, which isn't itself meaningful to assert on beyond "a
// number in that range," so it's left untested; what's worth verifying
// is that mockFetch actually waits out whatever delay it's given, rather
// than resolving immediately.
describe("mockFetch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("does not resolve before the configured delay has elapsed", async () => {
    let resolved = false;
    mockFetch({ value: 1 }, { delayMs: 500, failRate: 0 }).then(() => {
      resolved = true;
    });

    await jest.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);
  });

  it("resolves with the data once the delay has elapsed", async () => {
    const promise = mockFetch({ value: 42 }, { delayMs: 500, failRate: 0 });
    // The `expect(...).rejects/.resolves` chain has to exist *before*
    // advancing the fake timer, not after — mockFetch's setTimeout
    // callback settles the promise the instant the timer fires, and a
    // promise that settles (especially rejects) with nothing attached to
    // it yet trips Node's unhandled-rejection detector even though a
    // handler arrives a line later. Creating the assertion first attaches
    // a handler synchronously, before the timer ever advances.
    const assertion = expect(promise).resolves.toEqual({ value: 42 });
    await jest.advanceTimersByTimeAsync(500);
    await assertion;
  });

  it("returns a clone, not the same reference — mutating the result can't corrupt the source", async () => {
    const source = { items: [1, 2, 3] };
    const promise = mockFetch(source, { delayMs: 0, failRate: 0 });
    await jest.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(result).toEqual(source);
    expect(result).not.toBe(source);

    result.items.push(4);
    expect(source.items).toEqual([1, 2, 3]);
  });

  it("throws an ApiError when the fail rate triggers", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const promise = mockFetch({ value: 1 }, { delayMs: 0, failRate: 1 });
    const assertion = expect(promise).rejects.toBeInstanceOf(ApiError);
    await jest.advanceTimersByTimeAsync(0);
    await assertion;
  });

  it("does not throw when the fail rate never triggers", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.999);
    const promise = mockFetch({ value: 1 }, { delayMs: 0, failRate: 0.5 });
    const assertion = expect(promise).resolves.toEqual({ value: 1 });
    await jest.advanceTimersByTimeAsync(0);
    await assertion;
  });
});
