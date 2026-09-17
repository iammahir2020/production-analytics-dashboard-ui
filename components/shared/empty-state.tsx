"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Padding override for the compact dashboard cards, which are a
   * fraction of the orders table's height — the default py-16 is sized
   * for that full-width surface and would dwarf a 5-row panel. */
  className?: string;
}

// Generic and cross-feature on purpose (components/shared/, not
// components/orders/) — takes a plain callback rather than reaching into
// any specific filter hook itself, so the one real consumer today
// (OrdersTable's "no results" state) doesn't make this component orders-
// specific for whoever needs an empty state next.
export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 py-16 text-center", className)}>
      {icon}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <Button type="button" variant="outline" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
