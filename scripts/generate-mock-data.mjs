"use strict";

/**
 * Generates the mock datasets in lib/data/. Plain Node (no TypeScript) since
 * this is a one-off dev-time generator, not shipped code — its output is
 * what actually gets type-checked, via the service layer that reads it.
 * Uses a seeded RNG so re-running this script produces identical output,
 * which matters once Phase 5's tests assert against fixed data.
 */

import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(import.meta.dirname, "..", "lib", "data");
// Fixed, not `new Date()` — anchoring to the wall clock would make every
// date shift a little on each run (even seconds apart), defeating the
// point of the seeded RNG below. A fixed anchor is what actually makes
// re-running this script byte-for-byte reproducible.
const NOW = new Date("2026-09-16T00:00:00.000Z");
const SEED = 20260916;

function mulberry32(seed) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);

function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function pickWeighted(entries) {
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = rng() * totalWeight;
  for (const [value, weight] of entries) {
    if (threshold < weight) return value;
    threshold -= weight;
  }
  return entries[entries.length - 1][0];
}
function pickN(arr, n) {
  const shuffled = arr.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(n, shuffled.length));
}
function daysAgo(n) {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}
function randomDateBetween(start, end) {
  return new Date(start.getTime() + rng() * (end.getTime() - start.getTime()));
}
function round2(n) {
  return Math.round(n * 100) / 100;
}
function writeJson(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2) + "\n");
}
// Matches lib/format.ts's formatCurrency convention (৳ + Western digits,
// not Intl's locale-driven currency style — see that file for why).
function formatTaka(n) {
  return "৳" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FIRST_NAMES = [
  "Rahim", "Karim", "Fahim", "Arif", "Tanvir", "Shakil", "Rakib", "Imran",
  "Nusrat", "Sumaiya", "Farhana", "Jannatul", "Nazia", "Tasnim", "Anika",
];
const LAST_NAMES = [
  "Islam", "Ahmed", "Hossain", "Rahman", "Khan", "Chowdhury", "Akter",
  "Uddin", "Sarkar", "Talukder", "Molla", "Hasan", "Bhuiyan", "Sikder",
  "Kabir",
];
// BDT retail pricing — approximate real-world Bangladesh electronics-market
// ballpark figures (Daraz/Star Tech/Ryans-style pricing), not a currency
// conversion of the old USD prices, since local retail pricing doesn't
// track FX rates linearly (import duty, VAT, local market dynamics).
const PRODUCTS = [
  { name: "Wireless Mouse", price: 650 },
  { name: "Mechanical Keyboard", price: 4500 },
  { name: "USB-C Hub", price: 1650 },
  { name: "27-inch Monitor", price: 22000 },
  { name: "Noise-Canceling Headphones", price: 8500 },
  { name: "Laptop Stand", price: 1450 },
  { name: "Webcam 1080p", price: 2800 },
  { name: "Desk Lamp", price: 1200 },
  { name: "Ergonomic Chair Cushion", price: 1800 },
  { name: "Portable SSD 1TB", price: 8900 },
  { name: "Standing Desk Converter", price: 15500 },
  { name: "Bluetooth Speaker", price: 2600 },
];
const ORDER_STATUS_WEIGHTS = [
  ["completed", 50],
  ["processing", 15],
  ["pending", 10],
  ["cancelled", 15],
  ["refunded", 10],
];

// Orders that count as "spent"/revenue: payment is captured at order time,
// so pending/processing/completed count, cancelled/refunded don't. This
// same rule is reused by getSummaryStats() (step 11) so a customer's
// totalSpent and the dashboard's totalRevenue agree with each other.
const SPENT_STATUSES = new Set(["pending", "processing", "completed"]);

const CUSTOMER_COUNT = 50;
const customers = Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
  const idNum = String(i + 1).padStart(3, "0");
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const joinedAt = randomDateBetween(daysAgo(365), NOW);
  return {
    id: `cust_${idNum}`,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${idNum}@example.com`,
    joinedAt: joinedAt.toISOString(),
    totalOrders: 0,
    totalSpent: 0,
    active: false,
  };
});

const ORDER_COUNT = 200;
const orders = Array.from({ length: ORDER_COUNT }, (_, i) => {
  const idNum = String(i + 1).padStart(4, "0");
  const customer = pick(customers);
  const status = pickWeighted(ORDER_STATUS_WEIGHTS);
  const createdAt = randomDateBetween(daysAgo(90), NOW);
  const items = Array.from({ length: randInt(1, 4) }, () => {
    const product = pick(PRODUCTS);
    return { productName: product.name, quantity: randInt(1, 4), unitPrice: product.price };
  });
  const total = round2(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  return {
    id: `ord_${idNum}`,
    customerId: customer.id,
    customerName: customer.name,
    status,
    items,
    total,
    createdAt: createdAt.toISOString(),
  };
});
orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

const THIRTY_DAYS_AGO = daysAgo(30);
for (const customer of customers) {
  const ownOrders = orders.filter((o) => o.customerId === customer.id);
  customer.totalOrders = ownOrders.length;
  customer.totalSpent = round2(
    ownOrders.filter((o) => SPENT_STATUSES.has(o.status)).reduce((sum, o) => sum + o.total, 0)
  );
  customer.active = ownOrders.some((o) => new Date(o.createdAt) >= THIRTY_DAYS_AGO);
}

const FOURTEEN_DAYS_AGO = daysAgo(14);
const activities = [];
let activitySeq = 1;
function pushActivity(type, message, timestamp, relatedOrderId) {
  activities.push({
    id: `act_${String(activitySeq++).padStart(3, "0")}`,
    type,
    message,
    timestamp: timestamp.toISOString(),
    ...(relatedOrderId ? { relatedOrderId } : {}),
  });
}

const recentOrders = orders.filter((o) => new Date(o.createdAt) >= FOURTEEN_DAYS_AGO);
for (const order of pickN(recentOrders, 15)) {
  pushActivity(
    "order_created",
    `New order ${order.id} placed by ${order.customerName} — ${formatTaka(order.total)}`,
    new Date(order.createdAt),
    order.id
  );
}

const completedOrders = orders.filter((o) => o.status === "completed");
for (const order of pickN(completedOrders, 5)) {
  pushActivity(
    "order_status_changed",
    `Order ${order.id} marked as completed`,
    randomDateBetween(new Date(order.createdAt), NOW),
    order.id
  );
}

const cancelledOrders = orders.filter((o) => o.status === "cancelled");
for (const order of pickN(cancelledOrders, 3)) {
  pushActivity(
    "order_status_changed",
    `Order ${order.id} marked as cancelled`,
    randomDateBetween(new Date(order.createdAt), NOW),
    order.id
  );
}

const refundedOrders = orders.filter((o) => o.status === "refunded");
for (const order of pickN(refundedOrders, 3)) {
  pushActivity(
    "refund_issued",
    `Refund issued for order ${order.id} — ${formatTaka(order.total)}`,
    randomDateBetween(new Date(order.createdAt), NOW),
    order.id
  );
}

const recentCustomers = customers.filter((c) => new Date(c.joinedAt) >= FOURTEEN_DAYS_AGO);
for (const customer of pickN(recentCustomers, 4)) {
  pushActivity("customer_registered", `New customer ${customer.name} registered`, new Date(customer.joinedAt));
}

activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// A plausible total-visitor figure for computing conversion rate (orders /
// visitors) in getSummaryStats(). Generated the same reproducible way as
// everything else, appended last so it doesn't shift the RNG sequence that
// produced the customers/orders/activity data above — a real derived stat
// instead of a hardcoded ratio disguised as one.
const TOTAL_VISITORS = randInt(3500, 6500);

fs.mkdirSync(DATA_DIR, { recursive: true });
writeJson("mock-customers.json", customers);
writeJson("mock-orders.json", orders);
writeJson("mock-activity.json", activities);
writeJson("mock-analytics.json", { totalVisitors: TOTAL_VISITORS });

console.log(
  `Generated ${customers.length} customers, ${orders.length} orders, ${activities.length} activity events, ${TOTAL_VISITORS} visitors into ${DATA_DIR}`
);
