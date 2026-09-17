"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Route-level safety net for errors that occur outside any of the
// per-section SectionBoundary components — page.tsx's own render logic,
// or anything Next routes through the error.tsx convention directly.
// Per-section failures are already handled independently; this exists so
// the route is never left with no error UI at all.
export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Dashboard route failed to render:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="flex max-w-sm flex-col items-center gap-3 border-destructive/30 py-8 text-center">
        <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">The dashboard couldn&apos;t load. Try again.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      </Card>
    </div>
  );
}
