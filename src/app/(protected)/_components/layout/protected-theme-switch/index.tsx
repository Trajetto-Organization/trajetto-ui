"use client";

import { useEffect, useState } from "react";

import { Monitor, Moon, Sun, SunMoon } from "lucide-react";

import {
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import {
  ThemeSegmented,
  ThemeToggle,
  useThemeSwitch,
  type ThemeChoice,
} from "@/components/shared/theme-toggle";

import { cn } from "@/lib/utils";

/**
 * Where the theme switch lives in the signed-in app.
 *
 * - From `md`: an icon button in the top header, beside the search and the
 *   bell (`ProtectedHeaderThemeToggle`), plus a "Tema" submenu in the account
 *   menu, the only place on a desk to pick "Sistema" without opening the
 *   profile.
 * - Phones: the header has no room left (trigger, breadcrumb, search, bell),
 *   so the labeled segmented control sits in the sidebar sheet's footer,
 *   right above the account — one tap away, always visible when the menu is.
 */

const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
};

/** Desktop header: same 36px box, border and radius as the bell beside it. */
const ProtectedHeaderThemeToggle = (): JSX.Element => (
  <span className="hidden md:contents">
    <ThemeToggle
      tone="app"
      className="size-9 rounded-lg border border-input bg-background hover:text-accent-foreground"
    />
  </span>
);

/** The sheet footer on phones; renders nothing in the desktop sidebar. */
const ProtectedSidebarThemeSwitch = (): JSX.Element | null => {
  const { isMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <div className="flex flex-col gap-1.5 px-2 pb-1 pt-1">
      <span
        aria-hidden
        className="flex items-center gap-1.5 text-xs font-medium text-sidebar-foreground/70"
      >
        <SunMoon className="size-3.5" />
        Tema
      </span>
      {/* The control names itself "Tema" for assistive tech; the text above is
          its visible twin. Full width, tighter padding so the three options
          fit the 18rem sheet with their icons, and the sidebar's own tokens
          (the app's `muted` is another gray in the dark theme). */}
      <ThemeSegmented
        tone="app"
        showLabel={false}
        className={cn(
          "[&>[role=radiogroup]]:w-full [&>[role=radiogroup]]:bg-sidebar-accent [&_[role=radio]]:px-1.5",
          "dark:[&>[role=radiogroup]>span]:bg-sidebar dark:[&>[role=radiogroup]>span]:ring-1 dark:[&>[role=radiogroup]>span]:ring-sidebar-border",
        )}
      />
    </div>
  );
};

/** True after hydration: the stored theme is unknown on the server. */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted;
}

/**
 * The account menu's "Tema" submenu (desktop). A Radix radio group rather
 * than the segmented control: inside a menu, Tab is swallowed and arrows move
 * between menu items, so only menu items are reachable by keyboard.
 */
const ProtectedAccountThemeMenu = ({
  disabled,
}: {
  disabled?: boolean;
}): JSX.Element | null => {
  const { theme, setTheme } = useThemeSwitch();
  const { isMobile } = useSidebar();
  const mounted = useMounted();

  // Phones already have the segmented control in the sheet, one line above.
  if (isMobile) return null;

  const current: ThemeChoice =
    mounted && (theme === "light" || theme === "dark") ? theme : "system";

  const CurrentIcon =
    current === "dark" ? Moon : current === "light" ? Sun : Monitor;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer" disabled={disabled}>
        <CurrentIcon className="mr-3" aria-hidden />
        Tema
        <span className="flex-1 pl-3 pr-1 text-right text-xs text-muted-foreground">
          {mounted ? THEME_LABELS[current] : null}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="min-w-40">
          <DropdownMenuRadioGroup
            value={mounted ? current : undefined}
            onValueChange={(value) => setTheme(value as ThemeChoice)}
          >
            {(
              [
                { value: "light", icon: Sun },
                { value: "dark", icon: Moon },
                { value: "system", icon: Monitor },
              ] as const
            ).map(({ value, icon: Icon }) => (
              <DropdownMenuRadioItem
                key={value}
                value={value}
                className={cn("cursor-pointer gap-2")}
                // Keep the menu open: the change is seen behind it.
                onSelect={(event) => event.preventDefault()}
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                {THEME_LABELS[value]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
};

export {
  ProtectedAccountThemeMenu,
  ProtectedHeaderThemeToggle,
  ProtectedSidebarThemeSwitch,
};
