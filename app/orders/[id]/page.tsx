import { notFound } from "next/navigation";
import { getActivityForOrder } from "@/lib/api/activity";
import { getCustomerById } from "@/lib/api/customers";
import { getOrderById } from "@/lib/api/orders";
import { OrderDetailsView } from "@/components/orders/order-details-view";

// Same reasoning as the rest of the app: getOrderById goes through the
// simulated mockFetch delay and different ids need different data, so
// this route can't be meaningfully static-prerendered.
export const dynamic = "force-dynamic";

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
