import type { ReactNode } from "react";

interface SectionHeadingProps {
  children: ReactNode;
}

// The uppercase label heading every dashboard section renders above its
// panel — identical markup in 5 files (order status, top products, recent
// orders, recent activity, ×2 each for the real + skeleton version).
// Extracted once bumping its size (density recalibration, see learn.md)
// meant editing the same literal className string in all of them —
// exactly the "no single place to adjust" cost of the original ad hoc
// per-file approach.
export function SectionHeading({ children }: SectionHeadingProps) {
  return <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">{children}</h2>;
}
