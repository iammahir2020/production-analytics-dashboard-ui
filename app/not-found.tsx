import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Catches every notFound() in the app, and unknown URLs generally. The one
// that actually happens is an order id that doesn't resolve
// (app/orders/[id]/page.tsx calls notFound() for both a missing order and
// a missing customer) — reachable from a stale bookmark or a shared link
// to an order that no longer exists.
//
// A single global file rather than one per route: Next.js walks up to the
// nearest not-found boundary, so this covers both cases, and the copy
// below is true of either. Without it the app fell through to Next.js's
// own default 404 — unstyled system font, no explanation, and no way back
// (it renders inside the root layout, so the header was there, but
// nothing else was).
//
// The links are the point. "Not found" with no exit is a dead end, and
// this is the one screen a user can reach by doing nothing wrong.
export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="flex max-w-sm flex-col items-center gap-3 py-8 text-center">
        <FileQuestion className="size-5 text-muted-foreground" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Page not found</p>
          <p className="text-sm text-muted-foreground">
            This page doesn&apos;t exist. The order may have been removed, or the link may be out of date.
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {/* nativeButton={false}: these render a real <a>, not a
              <button> — without it Base UI assumes the render target is
              still a native button (its own default) and logs a dev
              warning that button-specific keyboard/ARIA behavior is being
              applied to a link, since it never gets to detect the actual
              rendered tag before that assumption is made. */}
          <Button render={<Link href="/orders" />} nativeButton={false} variant="outline" size="sm">
            Back to orders
          </Button>
          <Button render={<Link href="/" />} nativeButton={false} variant="ghost" size="sm">
            Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
