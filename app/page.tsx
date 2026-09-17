import { Suspense } from "react";
import { ChartsSection, ChartsSectionSkeleton } from "@/components/dashboard/charts-section";
import { OrderStatusBreakdown, OrderStatusBreakdownSkeleton } from "@/components/dashboard/order-status-breakdown";
import { RecentActivityFeed, RecentActivityFeedSkeleton } from "@/components/dashboard/recent-activity-feed";
import { RecentOrdersList, RecentOrdersListSkeleton } from "@/components/dashboard/recent-orders-list";
import { SummaryCards, SummaryCardsSkeleton } from "@/components/dashboard/summary-cards";
import { TopProducts, TopProductsSkeleton } from "@/components/dashboard/top-products";
import { SectionBoundary } from "@/components/shared/section-boundary";

// The service layer simulates network latency and this reads as live
// analytics, so render per request rather than baking the data in at build
// time — otherwise the loading and error states would only ever appear in
// dev, never in the deployed app.
export const dynamic = "force-dynamic";

// The page itself fetches nothing. Each section is an async Server
// Component behind its own Suspense boundary (skeleton matching its real
// layout) and its own SectionBoundary (error UI + retry) — one slow or
// failing data source degrades that section alone instead of the whole
// page, and sections stream in as they resolve rather than waiting on the
// slowest one.
export default function DashboardPage() {
  return (
    // sr-only, not removed: the nav bar already states "you're on
    // Dashboard" visually, so a second same-size heading right above the
    // KPI strip only competed with it. A heading still exists for screen
    // readers — there's no other landmark on this page announcing where
    // they are (Phase 2b, step 21.3).
    <div className="flex flex-col gap-3">
      <h1 className="sr-only">Dashboard</h1>

      <Suspense fallback={<SummaryCardsSkeleton />}>
        <SectionBoundary label="Overview">
          <SummaryCards />
        </SectionBoundary>
      </Suspense>

      <Suspense fallback={<ChartsSectionSkeleton />}>
        <SectionBoundary label="Charts">
          <ChartsSection />
        </SectionBoundary>
      </Suspense>

      {/* Order status (4/12) + top products (8/12) — a new data
          dependency (order aggregation, not the revenue timeseries
          ChartsSection already owns), so it's its own section rather than
          folded into ChartsSection, per the established "sections follow
          data dependencies" rule (Phase 2c). Narrower than the original
          5/7 split so the donut could grow without crowding the legend —
          top products, the higher-value content, gets the extra width. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Suspense fallback={<OrderStatusBreakdownSkeleton />}>
            <SectionBoundary label="Order status">
              <OrderStatusBreakdown />
            </SectionBoundary>
          </Suspense>
        </div>
        <div className="lg:col-span-8">
          <Suspense fallback={<TopProductsSkeleton />}>
            <SectionBoundary label="Top products">
              <TopProducts />
            </SectionBoundary>
          </Suspense>
        </div>
      </div>

      {/* Recent orders (7/12) + recent activity (5/12) side by side —
          two independent Suspense/SectionBoundary pairs, just laid out as
          grid siblings rather than stacked; each still streams and fails
          independently. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Suspense fallback={<RecentOrdersListSkeleton />}>
            <SectionBoundary label="Recent orders">
              <RecentOrdersList />
            </SectionBoundary>
          </Suspense>
        </div>
        <div className="lg:col-span-5">
          <Suspense fallback={<RecentActivityFeedSkeleton />}>
            <SectionBoundary label="Recent activity">
              <RecentActivityFeed />
            </SectionBoundary>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
