import customersData from "@/lib/data/mock-customers.json";
import type { Customer } from "@/lib/types/customer";
import { mockFetch } from "./client";

const customers = customersData as Customer[];

export async function getCustomers(): Promise<Customer[]> {
  return mockFetch(customers);
}

export async function getActiveCustomerCount(): Promise<number> {
  const activeCount = customers.filter((customer) => customer.active).length;
  return mockFetch(activeCount);
}

// Order Details (Phase 4) needs one customer's full record — email,
// join date, lifetime spend — none of which live on Order itself
// (Order only carries customerId/customerName). Every order's
// customerId resolves to a real customer (checked directly against the
// generated JSON), but the return type stays nullable since this is a
// general-purpose lookup, not one only ever called with a known-good id.
export async function getCustomerById(id: string): Promise<Customer | null> {
  const customer = customers.find((c) => c.id === id) ?? null;
  return mockFetch(customer);
}
