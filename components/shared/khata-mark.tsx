import type { SVGProps } from "react";

// The brand mark: a bound ledger with a folded page corner and a spine —
// redrawn as a clean vector from the chosen concept in the brand
// exploration pass (a solid, filled silhouette, not a stroke-based line
// icon like lucide's), so it needed its own component rather than reusing
// lucide's convention.
//
// Simplified from the original reference specifically for legibility at
// real usage sizes (a 20px header icon, a 16px browser-tab favicon) —
// tested at 16–128px before settling here: the reference's four individual
// spine "rings" read as a clean ring-binder only at 64px+ and blur into
// noise below that, so they're one solid spine bar here instead. The fold
// crease and page-stack line survive as a nice detail at larger sizes
// (a PWA install prompt, an OS app switcher) and simply fade below
// perceptibility at 16–20px without hurting the silhouette — kept rather
// than special-cased away, since they cost nothing where they don't show.
//
// Two color roles, not one: `color` (main shape) is meant to be set via a
// text-* className exactly like every lucide icon in this app already is.
// `detailColor` (the crease + page line, drawn as cutout-style strokes)
// defaults to `var(--background)` so those two details read as "recessed"
// against whatever surface the icon sits on, correctly in both themes,
// without needing a separate dark-mode version of this component.
interface KhataMarkProps extends SVGProps<SVGSVGElement> {
  detailColor?: string;
}

export function KhataMark({ detailColor = "var(--background)", ...props }: KhataMarkProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M 7.5 3.5 L 14.5 3.5 L 18.5 7.5 L 18.5 19 Q 18.5 19.5 18 19.5 L 8 19.5 Q 7.5 19.5 7.5 19 Z"
      />
      <rect x="5.3" y="3.5" width="2.2" height="16" rx="1.1" fill="currentColor" />
      <path stroke={detailColor} strokeWidth={0.6} d="M 14.5 3.5 L 14.5 7.5 L 18.5 7.5" />
      <path
        stroke={detailColor}
        strokeWidth={0.6}
        strokeLinecap="round"
        d="M 9.5 20.4 Q 13 21 16.5 20.4"
      />
    </svg>
  );
}
