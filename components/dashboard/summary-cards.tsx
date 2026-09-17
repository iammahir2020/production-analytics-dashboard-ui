import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { getSummaryStats } from "@/lib/api/analytics";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { PeriodDelta } from "@/lib/types/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Weight band capped at 400–600 (Phase 2b type pass) — hierarchy comes
// from size + color, not font-extrabold. Tracking tightens as size grows:
// -0.02em on the hero figure, -0.012em on the compact ones (per the
// documented scale in .interface-design/system.md: 20-32px -> -0.012em).
// Sizes bumped a notch (density recalibration, see learn.md) — the
// original 28/20/10px scale was calibrated against Linear's all-day-power-
// user density, which reads as too small for an app that's glanced at,
// not lived in.
const HERO_VALUE = "text-[34px] font-medium tracking-[-0.02em] tabular-nums text-primary";
const COMPACT_VALUE = "text-[24px] font-medium tracking-[-0.012em] tabular-nums text-foreground";
const LABEL = "text-[11px] font-semibold tracking-wider text-muted-foreground uppercase";

// Up = --chart-2 (the same green "completed" already uses), reused rather
// than a new hue. Down = --chart-3 (amber/warning), not --destructive —
// destructive stays reserved for money actually lost (cancelled/refunded
// orders in the ledger); a metric dipping isn't the same severity as that.
function DeltaBadge({ delta }: { delta: PeriodDelta }) {
  const Icon = delta.direction === "up" ? TrendingUp : delta.direction === "down" ? TrendingDown : Minus;
  const color =
    delta.direction === "up"
      ? "text-chart-2"
      : delta.direction === "down"
        ? "text-chart-3"
        : "text-muted-foreground";

  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-[12px] tabular-nums", color)}>
      <Icon className="size-3" aria-hidden="true" />
      {formatPercent(Math.abs(delta.changeFraction), 1)}
    </span>
  );
}

// Decorative trend line, not a real chart — a full Recharts instance for a
// 72x24px inline sparkline would be measurement/tooltip/legend machinery
// spent on something with no axes and no interaction. aria-hidden because
// the delta badge next to it already states the same trend as a number.
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 84;
  const h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((value - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="shrink-0 text-primary" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface HeroStatProps {
  value: string;
  delta: PeriodDelta;
  sparkline: number[];
}

// Spans 4/12 (was 6/12 before AOV became a 5th tile) — still sized by
// importance, not evenly split: 4/12 vs. each compact tile's 2/12 keeps
// revenue at 2x any one sibling. Revenue is the one figure that gets the
// brand accent and the trend context (delta + sparkline); the compacts
// don't compete for it.
function HeroStat({ value, delta, sparkline }: HeroStatProps) {
  return (
    // col-span-4 (no lg: override needed — 4/4 on the mobile grid-cols-4
    // grid and 4/12 on desktop are both the correct span with the same
    // literal value). Explicit at the base breakpoint on purpose — see
    // the Phase 2b lesson in step.md about an unset base span silently
    // defaulting to 1. No size="sm" — back to Card's default 16px padding
    // (density recalibration; the 12px "sm" variant read as cramped at
    // the bumped type scale).
    <Card className="col-span-4">
      <CardContent className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>Total revenue</span>
          <div className="flex items-baseline gap-2">
            <span className={HERO_VALUE}>{value}</span>
            <DeltaBadge delta={delta} />
          </div>
        </div>
        <Sparkline data={sparkline} />
      </CardContent>
    </Card>
  );
}

interface CompactStatProps {
  label: string;
  value: string;
  delta?: PeriodDelta;
}

function CompactStat({ label, value, delta }: CompactStatProps) {
  return (
    // col-span-2, unprefixed, applies at every breakpoint — no lg:
    // override needed since 2 is already correct on both grids, just as
    // a different fraction each time: 2/4 (half the row — two tiles per
    // row) on the mobile grid-cols-4 strip, 2/12 on desktop. col-span-1
    // (a quarter-row) was too narrow for a ৳-formatted value like AOV's
    // — Card clips overflow rather than wrapping it, so the figure was
    // silently cut off instead of erroring loudly.
    <Card className="col-span-2">
      <CardContent className="flex flex-col gap-1.5">
        <span className={LABEL}>{label}</span>
        <span className={COMPACT_VALUE}>{value}</span>
        {delta && <DeltaBadge delta={delta} />}
      </CardContent>
    </Card>
  );
}

export async function SummaryCards() {
  const summary = await getSummaryStats();

  return (
    // grid-cols-4 (was 3, before AOV became a 5th tile) on mobile: hero
    // takes the full row (col-span-4), then the four compact tiles sit
    // two-per-row (col-span-2 each — not col-span-1/"4 across", which
    // clipped AOV's longer ৳-formatted value; see CompactStat).
    <div className="grid grid-cols-4 gap-2 lg:grid-cols-12">
      <HeroStat
        value={formatCurrency(summary.totalRevenue)}
        delta={summary.revenueDelta}
        sparkline={summary.revenueSparkline}
      />
      <CompactStat label="Total orders" value={String(summary.totalOrders)} delta={summary.ordersDelta} />
      {/* No delta: the mock dataset has no per-period join tracking or
          per-period visitor counts, so a trend here would be invented
          rather than computed — see lib/types/analytics.ts. */}
      <CompactStat label="Active customers" value={String(summary.activeCustomers)} />
      <CompactStat label="Conversion rate" value={formatPercent(summary.conversionRate)} />
      {/* Real, not a second delta-less guess: revenue ÷ revenue-generating
          orders, computed in getSummaryStats() — see that function's own
          comment for why the denominator isn't totalOrders. */}
      <CompactStat label="Avg. order value" value={formatCurrency(summary.averageOrderValue)} />
    </div>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2 lg:grid-cols-12">
      <Card className="col-span-4">
        <CardContent className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-40" />
          </div>
          <Skeleton className="h-7 w-21" />
        </CardContent>
      </Card>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="col-span-2">
          <CardContent className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
