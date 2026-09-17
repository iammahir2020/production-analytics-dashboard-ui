"use client";

import { parseISO } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatDate, formatShortDate } from "@/lib/format";
import type { RevenuePoint } from "@/lib/types/analytics";
import { cn } from "@/lib/utils";

const chartConfig = {
  orders: {
    label: "Orders",
    // Reuses --chart-2 (the same green the order-status legend uses for
    // "completed") rather than a new hue, and stays distinct from
    // RevenueChart's --primary so the two charts read apart at a glance.
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

interface OrdersChartProps {
  data: RevenuePoint[];
  className?: string;
}

export function OrdersChart({ data, className }: OrdersChartProps) {
  return (
    <ChartContainer config={chartConfig} className={cn("aspect-auto w-full", className ?? "h-40")}>
      {/* right: 20 (not 8) — same corner-button clearance as RevenueChart. */}
      <BarChart data={data} margin={{ left: 0, right: 20, top: 8, bottom: 0 }}>
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
          width={26}
          allowDecimals={false}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatDate(parseISO(value as string))}
            />
          }
        />
        <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}
