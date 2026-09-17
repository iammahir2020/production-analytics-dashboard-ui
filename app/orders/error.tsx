"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface OrdersErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Same shape as app/error.tsx (the dashboard's route-level boundary) —
// this route has no per-section boundaries to fall back to first (see the
// architecture note in app/orders/page.tsx), so this is the only error UI
// the whole page has.
export default function OrdersError({ error, reset }: OrdersErrorProps) {
  useEffect(() => {
    console.error("Orders route failed to render:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="flex max-w-sm flex-col items-center gap-3 border-destructive/30 py-8 text-center">
        <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">The orders list couldn&apos;t load. Try again.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      </Card>
    </div>
  );
}
