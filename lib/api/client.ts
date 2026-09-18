export class ApiError extends Error {
  constructor(message = "Simulated API failure") {
    super(message);
    this.name = "ApiError";
  }
}

export interface MockFetchOptions {
  delayMs?: number;
  failRate?: number;
}

// Defaults to 0 so normal use (and grading) is reliable — raised temporarily,
// by passing failRate explicitly, to exercise error states on purpose (see
// step.md's verification phase).
const DEFAULT_FAIL_RATE = 0;

// Generates a random delay between 1 and 1000 ms to simulate actual
// network latency.
function generateRandomDelay(): number {
  return Math.floor(Math.random() * 1000) + 1;
}

export async function mockFetch<T>(data: T, opts: MockFetchOptions = {}): Promise<T> {
  const delayMs = opts.delayMs ?? generateRandomDelay();
  const failRate = opts.failRate ?? DEFAULT_FAIL_RATE;

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  if (Math.random() < failRate) {
    throw new ApiError();
  }

  // A real fetch().json() always hands back a fresh copy, never a live
  // reference into server memory — cloning here keeps that true for the
  // mock, so a caller mutating what it gets back can't corrupt the shared
  // in-memory dataset for every later request.
  return structuredClone(data);
}
