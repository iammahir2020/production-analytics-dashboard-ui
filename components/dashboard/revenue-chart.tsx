"use client";

import { parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, ReferenceDot, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency, formatCurrencyCompact, formatDate, formatShortDate } from "@/lib/format";
import type { RevenuePoint } from "@/lib/types/analytics";
import { cn } from "@/lib/utils";

const chartConfig = {
  revenue: {
    label: "Revenue",
    // --primary is already theme-aware (defined in both :root and .dark in
    // globals.css), so this resolves correctly without a separate
    // light/dark pair.
    color: "var(--primary)",
  },
} satisfies ChartConfig;

interface RevenueChartProps {
  data: RevenuePoint[];
  /** Defaults to the compact dashboard-tile height; the expanded dialog
   * view passes a taller class so the same component reads as "more
   * chart," not just "the same chart, scaled up." */
  className?: string;
}

export function RevenueChart({ data, className }: RevenueChartProps) {
  // .at(-1), not [data.length - 1]: it's typed `RevenuePoint | undefined`,
  // so the empty case is visible to the type checker rather than only at
  // runtime (this project doesn't run noUncheckedIndexedAccess).
  const lastPoint = data.at(-1);

  return (
    <ChartContainer
      config={chartConfig}
      role="img"
      aria-label="Revenue over time, area chart"
      className={cn("aspect-auto w-full", className ?? "h-40")}
    >
      {/* right: 20 (not 8) reserves room so the panel's corner expand
          button never sits on top of the last tick/date label. */}
      <AreaChart data={data} margin={{ left: 0, right: 20, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-grid-line" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          tick={{ fontSize: 12 }}
          tickFormatter={(value: string) => formatShortDate(parseISO(value))}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fontSize: 11 }}
          tickFormatter={(value: number) => formatCurrencyCompact(value)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatDate(parseISO(value as string))}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-xs"
                      style={{ backgroundColor: "var(--color-revenue)" }}
                    />
                    <span className="text-muted-foreground">{name}</span>
                  </div>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {formatCurrency(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          fill="url(#revenueFill)"
          dot={false}
        />
        {/* "An emphasized endpoint" per the confirmed direction — the
            latest day stands out rather than blending into 90 plotted
            points. Guarded: `data` is an ordinary array prop, and an empty
            one made this throw on `lastPoint.date` — which SectionBoundary
            then reported as "Couldn't load charts", claiming a failure for
            a fetch that actually succeeded and returned nothing. Callers
            render their own empty state (see ChartsSection); this just
            keeps the component itself safe for any input it accepts. */}
        {lastPoint && (
          <ReferenceDot
            x={lastPoint.date}
            y={lastPoint.revenue}
            r={4}
            fill="var(--color-revenue)"
            stroke="var(--background)"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ChartContainer>
  );
}
