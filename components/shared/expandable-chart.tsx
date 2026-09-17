"use client";

import type { ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ExpandableChartProps {
  title: string;
  meta?: string;
  /** The chart at its normal, compact size. */
  children: ReactNode;
  /**
   * The same chart, pre-rendered at its expanded size — a plain element,
   * not a render-prop closure. This component's caller (ChartsSection) is
   * a Server Component, and a function can't cross the Server → Client
   * boundary (only rendered elements can, the same way `children` does) —
   * an earlier version passed `renderExpanded: () => ReactNode` and it
   * built fine but threw at request time in production
   * ("Functions cannot be passed directly to Client Components"), caught
   * only by actually running the server, not by tsc/lint/build. Dialog
   * still only mounts this into the DOM once opened, so the eager prop
   * doesn't cost an eager paint.
   */
  expanded: ReactNode;
}

// Houses one chart in a bordered panel with a header (title + meta) and an
// always-visible corner control to view it full-size in a dialog. Hover-
// gated would be undiscoverable on a dashboard and dead on touch, so the
// button sits at muted contrast and brightens on hover/focus instead of
// appearing only on hover.
export function ExpandableChart({ title, meta, children, expanded }: ExpandableChartProps) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex items-baseline justify-between gap-2 px-3 pt-2.5 pb-1">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</span>
        {meta && <span className="font-mono text-[11px] text-muted-foreground">{meta}</span>}
      </div>
      <Dialog>
        <div className="relative px-1 pb-1">
          {children}
          <DialogTrigger
            render={
              <Button
                variant="outline"
                size="icon-xs"
                className="absolute right-1.5 bottom-1.5 text-muted-foreground hover:text-primary"
                aria-label={`Expand ${title} chart`}
              />
            }
          >
            <Maximize2 className="size-3" aria-hidden="true" />
          </DialogTrigger>
        </div>
        {/* Width scales up on larger screens — the expanded view's whole
            point is showing more resolution, and a 768px cap left most of
            a desktop monitor unused. DialogContent's built-in close button
            is `absolute top-2 right-2`; pr-9 on the header row keeps the
            right-aligned meta text from running underneath it. */}
        <DialogContent className="sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
          <DialogHeader>
            <div className="flex items-baseline justify-between gap-3 pr-9">
              <DialogTitle>{title}</DialogTitle>
              {meta && <span className="font-mono text-xs text-muted-foreground">{meta}</span>}
            </div>
          </DialogHeader>
          {expanded}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
