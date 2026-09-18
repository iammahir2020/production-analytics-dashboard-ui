import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatSignedCurrency } from "@/lib/format";
import { NEGATIVE_ORDER_STATUSES, OrderStatusIndicator } from "@/components/orders/order-status";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Activity } from "@/lib/types/activity";
import type { Customer } from "@/lib/types/customer";
import type { Order } from "@/lib/types/order";
import { cn } from "@/lib/utils";

interface OrderDetailsViewProps {
  order: Order;
  customer: Customer;
  activity: Activity[];
}

interface TimelineEntry {
  label: string;
  timestamp: string;
}

const ITEM_COUNT_FOR_SKELETON = 3;

// Presentational only (Phase 4, step 33) — app/orders/[id]/page.tsx does
// every fetch and hands down plain data, same Server-fetches/Client-or-
// server-renders-presentationally split as the rest of the app.
export function OrderDetailsView({ order, customer, activity }: OrderDetailsViewProps) {
  const negative = NEGATIVE_ORDER_STATUSES.has(order.status);

  // "Order placed" is a real fact every order carries (createdAt) — not
  // fabricated. Everything after it is whatever the activity log actually
  // recorded for this order (getActivityForOrder). Most orders have
  // nothing further logged: the generator only ever wrote ~29 activity
  // entries across 200 orders, so a one-entry timeline is an honest read
  // of the data, not a broken feature — inventing a matching "marked as
  // X" event for every status would fabricate data the mock set doesn't
  // actually have.
  const timeline: TimelineEntry[] = [
    { label: "Order placed", timestamp: order.createdAt },
    ...activity.map((entry) => ({ label: entry.message, timestamp: entry.timestamp })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Link
          href="/orders"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-semibold">{order.id}</h1>
            <OrderStatusIndicator status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <section className="flex flex-col gap-3">
            <SectionHeading>Items</SectionHeading>
            <Card className="overflow-hidden py-0">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Line items for order {order.id}</caption>
                <thead>
                  <tr className="border-b border-grid-line text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    <th className="px-4 pt-4 pb-2 font-semibold">Product</th>
                    <th className="px-4 pt-4 pb-2 text-right font-semibold">Qty</th>
                    <th className="px-4 pt-4 pb-2 text-right font-semibold">Unit price</th>
                    <th className="px-4 pt-4 pb-2 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={`${item.productName}-${index}`} className="border-b border-grid-line last:border-b-0">
                      <td className="px-4 py-2.5 font-medium">{item.productName}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold">
                      Total
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-semibold tabular-nums",
                        negative && "text-destructive"
                      )}
                    >
                      {formatSignedCurrency(order.total, negative)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading>Timeline</SectionHeading>
            <Card className="px-4">
              <ol className="flex flex-col gap-4">
                {timeline.map((entry, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex w-2 shrink-0 flex-col items-center">
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      {index !== timeline.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-grid-line" aria-hidden="true" />
                      )}
                    </span>
                    <span className="flex flex-col gap-0.5 pb-1">
                      <span className="text-sm font-medium">{entry.label}</span>
                      <span className="text-[13px] text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <section className="flex flex-col gap-3">
            <SectionHeading>Customer</SectionHeading>
            <Card className="flex flex-col gap-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{customer.name}</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[13px] font-medium",
                    customer.active ? "text-chart-2" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn("size-1.5 rounded-full", customer.active ? "bg-chart-2" : "bg-muted-foreground")}
                    aria-hidden="true"
                  />
                  {customer.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
              <dl className="grid grid-cols-2 gap-3 border-t border-grid-line pt-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Customer since
                  </dt>
                  <dd className="tabular-nums">{formatDate(customer.joinedAt)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Lifetime orders
                  </dt>
                  <dd className="tabular-nums">{customer.totalOrders}</dd>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                  <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Lifetime spend
                  </dt>
                  <dd className="font-semibold tabular-nums">{formatCurrency(customer.totalSpent)}</dd>
                </div>
              </dl>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

export function OrderDetailsViewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <section className="flex flex-col gap-3">
            <SectionHeading>Items</SectionHeading>
            <Card className="overflow-hidden py-0">
              <div className="flex flex-col">
                {Array.from({ length: ITEM_COUNT_FOR_SKELETON }).map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-4 px-4 py-2.5",
                      index !== ITEM_COUNT_FOR_SKELETON - 1 && "border-b border-grid-line"
                    )}
                  >
                    <Skeleton className="h-3.5 w-32 flex-1" />
                    <Skeleton className="h-3.5 w-8 shrink-0" />
                    <Skeleton className="h-3.5 w-16 shrink-0" />
                    <Skeleton className="h-3.5 w-16 shrink-0" />
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading>Timeline</SectionHeading>
            <Card className="flex flex-col gap-4 px-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="mt-1 size-2 shrink-0 rounded-full" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <section className="flex flex-col gap-3">
            <SectionHeading>Customer</SectionHeading>
            <Card className="flex flex-col gap-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-14" />
              </div>
              <Skeleton className="h-3.5 w-36" />
              <div className="grid grid-cols-2 gap-3 border-t border-grid-line pt-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <div className="col-span-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
