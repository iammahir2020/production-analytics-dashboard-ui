"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6">
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 border-transparent pb-1 text-sm font-medium transition-colors",
              isActive ? "border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
