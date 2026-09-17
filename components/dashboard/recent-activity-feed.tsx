import { PackagePlus, RefreshCw, Undo2, UserPlus } from "lucide-react";
import { getRecentActivity } from "@/lib/api/activity";
import { formatRelativeTime } from "@/lib/format";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityType } from "@/lib/types/activity";
import { cn } from "@/lib/utils";

const RECENT_LIMIT = 5;

// Neutral, not color-coded — order status already spends the page's "one
// accent used with intention" budget; a second color language here would
// compete with it rather than add real information.
const ACTIVITY_ICONS: Record<ActivityType, typeof PackagePlus> = {
  order_created: PackagePlus,
  order_status_changed: RefreshCw,
  customer_registered: UserPlus,
  refund_issued: Undo2,
};

export async function RecentActivityFeed() {
  const activity = await getRecentActivity(RECENT_LIMIT);

  return (
    // h-full + Card flex-1: RecentOrdersList (8 rows) is naturally taller
    // than this 5-row feed, and neither Suspense nor SectionBoundary/
    // ErrorBoundary render a wrapping element the grid's stretch reaches
    // through — same fix, same reason, as OrderStatusBreakdown. Left
    // top-aligned rather than centered (unlike that donut+legend block) —
    // a chronological list reads top-to-bottom, so any extra space
    // belongs at the bottom, not distributed around the rows.
    <section className="flex h-full flex-col gap-3">
      <SectionHeading>Recent activity</SectionHeading>
      <Card className="flex-1 py-0">
        <ul>
          {activity.map((entry, index) => {
            const Icon = ACTIVITY_ICONS[entry.type];
            return (
              <li
                key={entry.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3.5 text-sm",
                  // border-grid-line, not border-b-border — a rule between
                  // rows inside a panel, not a panel edge. Same hairline
                  // token the ledger table's row dividers use next to this
                  // panel in the same grid row (Phase 2b, step 21.5).
                  index !== activity.length - 1 && "border-b border-grid-line"
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="text-foreground">{entry.message}</p>
                  <span className="text-[13px] tabular-nums text-muted-foreground">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}

export function RecentActivityFeedSkeleton() {
  return (
    <section className="flex h-full flex-col gap-3">
      <SectionHeading>Recent activity</SectionHeading>
      <Card className="flex-1 py-0">
        <ul>
          {Array.from({ length: RECENT_LIMIT }).map((_, index) => (
            <li
              key={index}
              className={cn(
                "flex items-start gap-3 px-4 py-3.5",
                index !== RECENT_LIMIT - 1 && "border-b border-grid-line"
              )}
            >
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
