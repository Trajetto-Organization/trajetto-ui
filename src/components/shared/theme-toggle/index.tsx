"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

import { switchTheme, toggleTarget, type ThemeChoice } from "./switch-theme";

/**
 * The theme switch, in its two shapes, for the public site and the app.
 *
 * - `ThemeToggle`: a round icon button (sun/moon) for a desktop header.
 * - `ThemeSegmented`: the labeled "Tema: Claro · Escuro · Sistema" control,
 *   for a phone menu or a user menu, where "follow the system" must be
 *   choosable too.
 *
 * Both read and write next-themes (storage key "theme", class on <html>),
 * so the choice survives reloads and the init script paints it first, and
 * both switch through `useThemeSwitch` (the cross-fade, see switch-theme.ts).
 */

/** Variant of the surrounding UI: the public site's tokens or the app's. */
type ThemeControlTone = "site" | "app";

/** True after hydration: the stored theme is unknown on the server. */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted;
}

/**
 * next-themes' `useTheme`, with `setTheme` going through the view
 * transition. Every theme control uses this one, so a switch looks the same
 * from the header, a menu or the profile.
 */
function useThemeSwitch(): {
  theme: string | undefined;
  resolvedTheme: string | undefined;
  setTheme: (choice: ThemeChoice) => void;
} {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const switchTo = useCallback(
    (choice: ThemeChoice) => switchTheme(setTheme, choice),
    [setTheme],
  );

  return { theme, resolvedTheme, setTheme: switchTo };
}

interface ThemeToggleProps {
  className?: string;
  tone?: ThemeControlTone;
}

const ThemeToggle = ({
  className,
  tone = "site",
}: ThemeToggleProps): JSX.Element => {
  const { resolvedTheme, setTheme } = useThemeSwitch();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  // Until hydration the label cannot name the target theme; the icons need
  // no such wait, they follow the `.dark` class through CSS.
  const label = !mounted
    ? "Alternar tema"
    : isDark
      ? "Alternar para tema claro"
      : "Alternar para tema escuro";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Not `isDark`: a second click can land before React re-renders.
      onClick={() => setTheme(toggleTarget())}
      className={cn(
        "relative inline-flex size-[38px] shrink-0 items-center justify-center rounded-[11px]",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
        tone === "site"
          ? "text-site-ink hover:bg-site-soft focus-visible:ring-site-ink/40"
          : "text-foreground hover:bg-accent focus-visible:ring-ring",
        className,
      )}
    >
      {/* Moon in light (go dark), sun in dark (go light), like the design.
          The two swap with a quarter turn and a scale. */}
      <Moon
        aria-hidden
        className="size-[17px] rotate-0 scale-100 transition-transform duration-500 ease-site dark:-rotate-90 dark:scale-0"
      />
      <Sun
        aria-hidden
        className="absolute size-[17px] rotate-90 scale-0 transition-transform duration-500 ease-site dark:rotate-0 dark:scale-100"
      />
    </button>
  );
};

const CHOICES: ReadonlyArray<{
  value: ThemeChoice;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

interface ThemeSegmentedProps {
  className?: string;
  tone?: ThemeControlTone;
  /** Shows "Tema" before the control. Off when the host labels it itself. */
  showLabel?: boolean;
}

/**
 * A radio group (one tab stop, arrows move the choice), drawn as a segmented
 * control with a sliding thumb.
 */
const ThemeSegmented = ({
  className,
  tone = "site",
  showLabel = true,
}: ThemeSegmentedProps): JSX.Element => {
  const { theme, setTheme } = useThemeSwitch();
  const mounted = useMounted();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();

  const current: ThemeChoice | null = mounted
    ? ((CHOICES.find((choice) => choice.value === theme)?.value ??
        "system") as ThemeChoice)
    : null;
  const index = current
    ? CHOICES.findIndex((choice) => choice.value === current)
    : -1;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, at: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const target = event.key === "Home" ? 0 : CHOICES.length - 1;
      setTheme(CHOICES[target].value);
      refs.current[target]?.focus();
      return;
    }

    if (!step) return;

    event.preventDefault();
    const target = (at + step + CHOICES.length) % CHOICES.length;
    setTheme(CHOICES[target].value);
    refs.current[target]?.focus();
  }

  const site = tone === "site";

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {showLabel ? (
        <span
          id={labelId}
          className={cn(
            "text-sm font-medium",
            site ? "text-site-ink" : "text-foreground",
          )}
        >
          Tema
        </span>
      ) : null}
      <div
        role="radiogroup"
        aria-label={showLabel ? undefined : "Tema"}
        aria-labelledby={showLabel ? labelId : undefined}
        className={cn(
          "relative grid grid-cols-3 rounded-[12px] p-1",
          site ? "bg-site-soft2" : "bg-muted",
        )}
      >
        {/* The thumb slides under the checked option; hidden until the
            stored theme is known, so it never jumps after hydration. */}
        <span
          aria-hidden
          className={cn(
            "absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/3)] rounded-[9px] transition-[transform,opacity] duration-300 ease-site",
            site
              ? "bg-site-surface shadow-[0_1px_2px_rgba(14,14,20,.08),0_4px_10px_-4px_rgba(14,14,20,.18)]"
              : "bg-background shadow-sm",
            index < 0 ? "opacity-0" : "opacity-100",
          )}
          style={{ transform: `translateX(${Math.max(index, 0) * 100}%)` }}
        />
        {CHOICES.map(({ value, label, icon: Icon }, at) => {
          const checked = current === value;

          return (
            <button
              key={value}
              ref={(node) => {
                refs.current[at] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              // One tab stop: the checked option (the first before hydration).
              tabIndex={checked || (index < 0 && at === 0) ? 0 : -1}
              onClick={() => setTheme(value)}
              onKeyDown={(event) => onKeyDown(event, at)}
              className={cn(
                "relative z-10 inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[9px] px-2.5 text-[13px] min-[400px]:px-3 font-medium",
                "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
                site
                  ? cn(
                      "focus-visible:ring-site-ink/40",
                      checked
                        ? "text-site-ink"
                        : "text-site-muted hover:text-site-ink",
                    )
                  : cn(
                      "focus-visible:ring-ring",
                      checked
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    ),
              )}
            >
              {/* Icons drop out on the narrowest phones, where the three words alone fit. */}
              <Icon aria-hidden className="size-[15px] max-[399px]:hidden" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { ThemeSegmented, ThemeToggle, useThemeSwitch };
export type { ThemeChoice, ThemeControlTone };
