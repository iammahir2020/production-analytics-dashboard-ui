// A small, hand-built fixture rather than the real 200-order generated
// dataset (lib/data/mock-orders.json) — that dataset is meant to be
// regenerated (scripts/generate-mock-data.mjs is seeded but its output
// isn't a stable contract to test against), so a unit test asserting on
// getOrders()'s *logic* needs its own fixed input instead of depending
// on whatever the generator currently produces. jest.mock intercepts the
// same "@/lib/data/mock-orders.json" specifier getOrders() itself
// imports, so this stays a real test of the function, not a
// reimplementation of it.
//
// The fixture array is written directly inside the factory, not as an
// outer const the factory closes over — jest.mock() calls are hoisted
// above every other top-level statement in the file (including a `const`
// declared physically above them), so a factory that referenced an
// outer const here would run into that const before it's initialized.
jest.mock("@/lib/data/mock-orders.json", () => [
  {
    id: "ord_a",
    customerId: "cust_1",
    customerName: "Karim Ahmed",
    status: "pending",
    items: [{ productName: "Test Product", quantity: 1, unitPrice: 1000 }],
    total: 1000,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ord_b",
    customerId: "cust_2",
    customerName: "Fahim Rahman",
    status: "processing",
    items: [{ productName: "Test Product", quantity: 1, unitPrice: 2000 }],
    total: 2000,
    createdAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "ord_c",
    customerId: "cust_1",
    customerName: "Karim Ahmed",
    status: "completed",
    items: [{ productName: "Test Product", quantity: 1, unitPrice: 3000 }],
    total: 3000,
    createdAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "ord_d",
    customerId: "cust_3",
    customerName: "Nusrat Islam",
    status: "cancelled",
    items: [{ productName: "Test Product", quantity: 1, unitPrice: 4000 }],
    total: 4000,
    createdAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "ord_e",
    customerId: "cust_2",
    customerName: "Fahim Rahman",
    status: "refunded",
    items: [{ productName: "Test Product", quantity: 1, unitPrice: 5000 }],
    total: 5000,
    createdAt: "2026-01-20T00:00:00.000Z",
  },
]);

// Deterministic: no real delay/failure to wait out or trigger.
jest.mock("@/lib/api/client", () => ({
  mockFetch: jest.fn((data: unknown) => Promise.resolve(data)),
}));

import { getOrderById, getOrders } from "@/lib/api/orders";

describe("getOrders", () => {
  it("filters by status", async () => {
    const { orders, total } = await getOrders({ status: "completed" });
    expect(total).toBe(1);
    expect(orders.map((o) => o.id)).toEqual(["ord_c"]);
  });

  it("searches order id, case-insensitively", async () => {
    const { orders } = await getOrders({ search: "ORD_b" });
    expect(orders.map((o) => o.id)).toEqual(["ord_b"]);
  });

  it("searches customer name, matching every order for that customer", async () => {
    const { orders } = await getOrders({ search: "karim" });
    // Sorted newest-first: ord_c (Jan 10) before ord_a (Jan 1).
    expect(orders.map((o) => o.id)).toEqual(["ord_c", "ord_a"]);
  });

  it("filters by an inclusive date range", async () => {
    const { orders, total } = await getOrders({ dateFrom: "2026-01-05", dateTo: "2026-01-15" });
    expect(total).toBe(3);
    expect(orders.map((o) => o.id).sort()).toEqual(["ord_b", "ord_c", "ord_d"]);
  });

  it("paginates using the given page size, newest-first", async () => {
    const page1 = await getOrders({ pageSize: 2, page: 1 });
    expect(page1.total).toBe(5);
    expect(page1.orders.map((o) => o.id)).toEqual(["ord_e", "ord_d"]);

    const page2 = await getOrders({ pageSize: 2, page: 2 });
    expect(page2.orders.map((o) => o.id)).toEqual(["ord_c", "ord_b"]);

    const page3 = await getOrders({ pageSize: 2, page: 3 });
    expect(page3.orders.map((o) => o.id)).toEqual(["ord_a"]);
  });

  it("defaults to a page size of 10 when none is given", async () => {
    const { orders, pageSize, page } = await getOrders({});
    expect(pageSize).toBe(10);
    expect(page).toBe(1);
    expect(orders).toHaveLength(5);
  });

  it("clamps a page beyond the real page count to the last real page, instead of returning zero rows", async () => {
    const result = await getOrders({ pageSize: 2, page: 999 });
    expect(result.page).toBe(3); // ceil(5 / 2) — the real last page
    expect(result.total).toBe(5); // the filters still matched everything
    expect(result.orders.map((o) => o.id)).toEqual(["ord_a"]); // same rows page 3 would return directly
  });
});

describe("getOrderById", () => {
  it("returns the matching order", async () => {
    const order = await getOrderById("ord_d");
    expect(order?.customerName).toBe("Nusrat Islam");
  });

  it("returns null for an id that doesn't exist", async () => {
    const order = await getOrderById("ord_does_not_exist");
    expect(order).toBeNull();
  });
});
