import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActivityForOrder } from "@/lib/api/activity";
import { getCustomerById } from "@/lib/api/customers";
import { getOrderById } from "@/lib/api/orders";
import { OrderDetailsView } from "@/components/orders/order-details-view";

// Same reasoning as the rest of the app: getOrderById goes through the
// simulated mockFetch delay and different ids need different data, so
// this route can't be meaningfully static-prerendered.
export const dynamic = "force-dynamic";

// Every order page otherwise shared the root layout's generic <title>
// ("Khata") — real for the dashboard and the orders list, not for a page
// whose entire reason to be its own dedicated route (not a modal, per
// plan.md) is that it identifies one specific order. getOrderById is
// React.cache-wrapped (see lib/api/orders.ts), so this and the page
// component below share one lookup per request rather than paying the
// mock delay twice. A missing/bad id falls back to a title that doesn't
// promise an order that isn't there — notFound() is still what actually
// renders the 404 UI; this only covers what the browser tab says while
// that resolves.
export async function generateMetadata({ params }: PageProps<"/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderById(id);
  return { title: order ? `Order ${order.id}` : "Order not found" };
}

export default async function OrderDetailsPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  // Both fetches only need the order that just resolved, so they run in
  // parallel rather than sequentially. Every order's customerId resolves
  // to a real customer — checked directly against the generated JSON —
  // but getCustomerById is a general-purpose lookup with a nullable
  // return type, so this still narrows explicitly instead of asserting
  // past it; a lookup that somehow failed is exactly what notFound() is
  // for, same as the order lookup above it.
  const [customer, activity] = await Promise.all([
    getCustomerById(order.customerId),
    getActivityForOrder(order.id),
  ]);
  if (!customer) notFound();

  return <OrderDetailsView order={order} customer={customer} activity={activity} />;
}
