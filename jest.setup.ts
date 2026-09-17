import "@testing-library/jest-dom";

// jest-environment-jsdom's global scope doesn't include structuredClone
// (a real gap in that test environment, not a production concern — real
// Node and every modern browser have it) — lib/api/client.ts's mockFetch
// relies on it to clone mock responses. This file itself runs inside that
// same jsdom-provided global, so even the outer Node process's own real
// structuredClone isn't reachable by name here; a JSON round-trip is a
// faithful enough stand-in specifically because every value mockFetch
// ever clones in this app is already plain JSON (parsed straight out of
// lib/data/*.json) — no Dates, Maps, or circular references anywhere in
// this app's data types for it to fall short on.
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
}
