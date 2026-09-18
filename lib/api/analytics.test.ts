// Same jest.mock structure/reasoning as lib/api/orders.test.ts: a small,
// hand-built fixture rather than the real generated dataset, written
// directly inside each factory (jest.mock calls are hoisted above every
// other top-level statement, including a const declared physically above
// them — a factory closing over an outer const would run into it before
// it's initialized).
//
// One fixture, shared by every test below, deliberately split into two
// date clusters relative to each other:
//   - "recent" orders (Feb 2026) sit inside getSummaryStats' own trailing
//     30-day window, and are all cancelled/refunded — non-revenue-
//     generating on purpose, so the *current* period's own revenue lands
//     on exactly 0 while its order *count* doesn't, letting one fixture
//     exercise both outcomes of periodDelta's previous-period-is-zero
//     guard: "flat" for revenue (0 vs 0), "up" for order count (2 vs 0).
//   - "old" orders (Sep/Oct 2025) sit outside *both* the current and the
//     previous 30-day windows entirely (comfortably more than 60 days
//     before the latest order) — they still count toward totalRevenue/
//     averageOrderValue (whole-dataset figures), just not toward either
//     period's delta. Both are revenue-generating, so together they make
//     averageOrderValue's real denominator (2 revenue-generating orders,
//     giving 3000) visibly diverge from totalOrders (4, which would give
//     1500) — the exact distinction getSummaryStats' own comment names.
jest.mock("@/lib/data/mock-orders.json", () => [
  {
    id: "ord_recent_cancelled",
    customerId: "cust_1",
    customerName: "Karim Ahmed",
    status: "cancelled",
    items: [{ productName: "Product A", quantity: 5, unitPrice: 1000 }],
    total: 5000,
    createdAt: "2026-02-10T00:00:00.000Z", // the dataset's latest order
  },
  {
    id: "ord_recent_refunded",
    customerId: "cust_2",
    customerName: "Fahim Rahman",
    status: "refunded",
    items: [{ productName: "Product A", quantity: 3, unitPrice: 1000 }],
    total: 3000,
    createdAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "ord_old_completed",
    customerId: "cust_1",
    customerName: "Karim Ahmed",
    status: "completed",
    items: [
      { productName: "Product A", quantity: 2, unitPrice: 1000 },
      { productName: "Product B", quantity: 1, unitPrice: 2000 },
    ],
    total: 4000,
    createdAt: "2025-10-01T00:00:00.000Z", // >60 days before the latest order
  },
  {
    id: "ord_old_pending",
    customerId: "cust_3",
    customerName: "Nusrat Islam",
    status: "pending",
    items: [{ productName: "Product B", quantity: 1, unitPrice: 2000 }],
    total: 2000,
    createdAt: "2025-09-15T00:00:00.000Z",
  },
]);

jest.mock("@/lib/data/mock-analytics.json", () => ({ totalVisitors: 1000 }));

// Deterministic: no real delay to wait out.
jest.mock("@/lib/api/client", () => ({
  mockFetch: jest.fn((data: unknown) => Promise.resolve(data)),
}));

// getSummaryStats() calls this for one of its own fields — stubbed so
// this test file exercises analytics.ts's own logic, not customers.ts's.
jest.mock("@/lib/api/customers", () => ({
  getActiveCustomerCount: jest.fn(() => Promise.resolve(7)),
}));

import { getSummaryStats, getTopProducts } from "@/lib/api/analytics";

describe("getSummaryStats", () => {
  it("divides revenue by revenue-generating orders only, not every order", async () => {
    const { averageOrderValue, totalRevenue, totalOrders } = await getSummaryStats();

    expect(totalOrders).toBe(4);
    expect(totalRevenue).toBe(6000); // the two "old" orders only — cancelled/refunded don't count
    expect(averageOrderValue).toBe(3000); // 6000 / 2 revenue-generating orders
    expect(averageOrderValue).not.toBe(totalRevenue / totalOrders); // 1500 — the wrong denominator
  });

  it("treats a zero-activity previous period as flat when the current period is also zero, and up when it isn't", async () => {
    const { revenueDelta, ordersDelta } = await getSummaryStats();

    // Both "recent" orders (the only ones inside the trailing 30-day
    // window) are cancelled/refunded — the window has 2 real orders but
    // $0 of revenue, and the prior 30-day window has none at all.
    expect(revenueDelta).toEqual({ changeFraction: 0, direction: "flat" });
    expect(ordersDelta).toEqual({ changeFraction: 1, direction: "up" });
  });
});

describe("getTopProducts", () => {
  it("aggregates only revenue-generating orders' items, excluding cancelled/refunded ones entirely", async () => {
    const products = await getTopProducts();

    // Product A appears on a cancelled order (5 units) and a refunded
    // one (3 units) too — neither should contribute. Only the 2 units on
    // the "old" completed order count.
    const productA = products.find((p) => p.productName === "Product A");
    expect(productA).toEqual({ productName: "Product A", revenue: 2000, unitsSold: 2 });

    // Product B: 1 unit from the completed order + 1 from the pending
    // one, both revenue-generating statuses.
    const productB = products.find((p) => p.productName === "Product B");
    expect(productB).toEqual({ productName: "Product B", revenue: 4000, unitsSold: 2 });
  });

  it("sorts by revenue descending", async () => {
    const products = await getTopProducts();
    expect(products.map((p) => p.productName)).toEqual(["Product B", "Product A"]);
  });
});
