"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ORDER_STATUS_COLOR_VAR, ORDER_STATUS_STYLES } from "@/components/orders/order-status";
import type { StatusBreakdownPoint } from "@/lib/types/analytics";
import type { OrderStatus } from "@/lib/types/order";

interface StatusDonutProps {
  data: StatusBreakdownPoint[];
}

// Labels only (no color/theme) — Cells still set their own fill directly,
// since a pie's per-slice color can't be expressed through a chart
// config's single color/theme field the way a single-series chart's can.
// This config exists so ChartTooltipContent can resolve a status key back
// to its display label.
const chartConfig: ChartConfig = Object.fromEntries(
  Object.entries(ORDER_STATUS_STYLES).map(([status, style]) => [status, { label: style.label }])
);

// Grown twice now: 96px -> 128px (first restructure, to earn its wider
// share of a narrower panel) -> 160px (density recalibration). Interactive
// since the first restructure — hover shows the same label+count the
// legend states, via a tooltip rather than leaving that only readable in
// the always-visible legend beside it.
export function StatusDonut({ data }: StatusDonutProps) {
  return (
    <ChartContainer
      config={chartConfig}
      role="img"
      aria-label="Order status breakdown, donut chart — see the list beside it for exact counts"
      className="h-40 w-40 shrink-0"
    >
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => {
                const status = (item?.payload as StatusBreakdownPoint | undefined)?.status as
                  | OrderStatus
                  | undefined;
                const style = status ? ORDER_STATUS_STYLES[status] : undefined;
                return (
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: status ? ORDER_STATUS_COLOR_VAR[status] : undefined }}
                      />
                      <span className="text-muted-foreground">{style?.label}</span>
                    </div>
                    <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
                  </div>
                );
              }}
            />
          }
        />
        <Pie data={data} dataKey="count" nameKey="status" innerRadius={42} outerRadius={72} strokeWidth={2}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={ORDER_STATUS_COLOR_VAR[entry.status]} stroke="var(--card)" />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
