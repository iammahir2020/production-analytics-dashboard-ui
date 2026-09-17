import Link from "next/link";
import { KhataMark } from "@/components/shared/khata-mark";
import { NavLinks } from "@/components/shared/nav-links";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function AppHeader() {
  return (
    <header className="border-b border-border">
      {/* max-w-7xl matches app/layout.tsx's <main> — kept in sync so the
          header and page content align to the same edges. */}
      <div className="mx-auto flex h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          {/* Icon in the accent color, wordmark in ink — the icon carries
              the brand color so the name itself doesn't have to compete
              with the nav links' own active-state color for attention. */}
          <Link href="/" aria-label="Khata home" className="flex items-center gap-2">
            <KhataMark className="size-5 text-primary" />
            <span className="text-base font-semibold tracking-tight text-foreground">Khata</span>
          </Link>
          <NavLinks />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
