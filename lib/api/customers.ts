import customersData from "@/lib/data/mock-customers.json";
import type { Customer } from "@/lib/types/customer";
import { mockFetch } from "./client";

export async function getCustomers(): Promise<Customer[]> {
  return mockFetch(customersData);
}

export async function getActiveCustomerCount(): Promise<number> {
  const activeCount = customersData.filter((customer) => customer.active).length;
  return mockFetch(activeCount);
}
