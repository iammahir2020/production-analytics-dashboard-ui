import { ChartSpline } from "lucide-react";
import { getRevenueTimeseries } from "@/lib/api/analytics";
import { OrdersChart } from "@/components/dashboard/orders-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { ChartPanelHeader, ExpandableChart } from "@/components/shared/expandable-chart";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Both charts read this same timeseries — one fetch, one Suspense
// boundary, so a failure here fails both together rather than duplicating
// the call (or risking the two charts silently disagreeing on the data).
//
// Revenue leads at 8/12 columns, orders trails at 4/12 — sized by which
// figure the business actually leads with, not split evenly. Both are
// housed in a bordered panel (ExpandableChart) rather than floating loose
// on the page background, and both stay at a compact ~128px row height;
// the corner expand control (not more permanent vertical space) is how a
// closer read of 90 days of daily data stays available.
export async function ChartsSection() {
  const revenue = await getRevenueTimeseries();

  // Both charts read the same series, so they're empty together — handled
  // once here rather than twice inside the chart components. The panels
  // still render (title, meta, border), so the dashboard's shape doesn't
  // change between "no data" and "data"; only what's inside them does.
  // Deliberately no expand control on an empty panel: there's nothing
  // larger to look at.
  if (revenue.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <EmptyChartPanel label="Revenue" meta="daily · ৳ lakh" />
        </div>
        <div className="lg:col-span-4">
          <EmptyChartPanel label="Orders" meta="daily" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <ExpandableChart
          title="Revenue"
          meta="daily · ৳ lakh"
          expanded={<RevenueChart data={revenue} className="h-[60vh]" />}
        >
          <RevenueChart data={revenue} />
        </ExpandableChart>
      </div>
      <div className="lg:col-span-4">
        <ExpandableChart
          title="Orders"
          meta="daily"
          expanded={<OrdersChart data={revenue} className="h-[60vh]" />}
        >
          <OrdersChart data={revenue} />
        </ExpandableChart>
      </div>
    </div>
  );
}

function ChartPanelSkeleton({ label, meta }: { label: string; meta: string }) {
  return (
    <Card className="gap-0 py-0">
      <ChartPanelHeader title={label} meta={meta} />
      <div className="px-1 pb-1">
        <Skeleton className="h-40 w-full" />
      </div>
    </Card>
  );
}

// h-40 matches the real chart body's default height exactly, so a panel
// doesn't change size between having data and not.
function EmptyChartPanel({ label, meta }: { label: string; meta: string }) {
  return (
    <Card className="gap-0 py-0">
      <ChartPanelHeader title={label} meta={meta} />
      <div className="flex h-40 items-center justify-center px-1 pb-1">
        <EmptyState
          icon={<ChartSpline className="size-6 text-muted-foreground" aria-hidden="true" />}
          title="No data for this period"
          className="py-0"
        />
      </div>
    </Card>
  );
}

export function ChartsSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <ChartPanelSkeleton label="Revenue" meta="daily · ৳ lakh" />
      </div>
      <div className="lg:col-span-4">
        <ChartPanelSkeleton label="Orders" meta="daily" />
      </div>
    </div>
  );
}
