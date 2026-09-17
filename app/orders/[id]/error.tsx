"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface OrderDetailsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Same shape as app/orders/error.tsx, but its own file: without this,
// a failure here would still be caught (error boundaries cascade up to
// the nearest ancestor segment that has one, and app/orders/error.tsx
// sits right above this route) — but its copy ("The orders list
// couldn't load") would misdescribe a single order failing to load, not
// the list. Not in step.md's Phase 4 list explicitly, but every other
// route already gets a boundary with accurate copy; leaving this one out
// would be the inconsistency, not adding it.
export default function OrderDetailsError({ error, reset }: OrderDetailsErrorProps) {
  useEffect(() => {
    console.error("Order details route failed to render:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="flex max-w-sm flex-col items-center gap-3 border-destructive/30 py-8 text-center">
        <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">This order couldn&apos;t load. Try again.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      </Card>
    </div>
  );
}
