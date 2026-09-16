"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMounted } from "@/hooks/use-mounted";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // useTheme() can't know the stored preference until after mount (the
  // server has no access to localStorage) — guarding on `mounted` avoids
  // rendering a false "nothing selected" state that would otherwise pop
  // into the real value right after hydration.
  const mounted = useMounted();

  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      value={mounted && theme ? [theme] : []}
      onValueChange={(values) => {
        const next = values[0];
        if (next) setTheme(next);
      }}
      aria-label="Theme"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary"
        >
          <Icon className="size-4" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
