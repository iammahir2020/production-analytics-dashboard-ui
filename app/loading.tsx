import { ChartsSectionSkeleton } from "@/components/dashboard/charts-section";
import { OrderStatusBreakdownSkeleton } from "@/components/dashboard/order-status-breakdown";
import { RecentActivityFeedSkeleton } from "@/components/dashboard/recent-activity-feed";
import { RecentOrdersListSkeleton } from "@/components/dashboard/recent-orders-list";
import { SummaryCardsSkeleton } from "@/components/dashboard/summary-cards";
import { TopProductsSkeleton } from "@/components/dashboard/top-products";

// Route-level loading UI — shown while navigating to this route, before
// page.tsx itself (and its own per-section Suspense boundaries) has
// started rendering. Reuses the same skeletons the per-section fallbacks
// use, rather than inventing a third loading representation.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="sr-only">Dashboard</h1>
      <SummaryCardsSkeleton />
      <ChartsSectionSkeleton />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <OrderStatusBreakdownSkeleton />
        </div>
        <div className="lg:col-span-8">
          <TopProductsSkeleton />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RecentOrdersListSkeleton />
        </div>
        <div className="lg:col-span-5">
          <RecentActivityFeedSkeleton />
        </div>
      </div>
    </div>
  );
}
