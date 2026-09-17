import Link from "next/link";
import { NotebookText } from "lucide-react";
import { NavLinks } from "@/components/shared/nav-links";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function AppHeader() {
  return (
    <header className="border-b border-border">
      {/* max-w-7xl matches app/layout.tsx's <main> — kept in sync so the
          header and page content align to the same edges. */}
      <div className="mx-auto flex h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Dashboard home" className="flex items-center">
            <NotebookText className="size-5 text-primary" aria-hidden="true" />
          </Link>
          <NavLinks />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
