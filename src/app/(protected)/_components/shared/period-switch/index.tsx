"use client";

import type { ReactNode } from "react";

import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PeriodSwitchOption<T extends string> {
  value: T;
  label: string;
}

interface PeriodSwitchProps<T extends string> {
  value: T;
  options: ReadonlyArray<PeriodSwitchOption<T>>;
  onChange: (value: T) => void;
  /** Names the group for a screen reader ("Período das entregas"). */
  label: string;
  /** Anchor for the page's guided tour. */
  dataTutorial?: string;
  disabled?: boolean;
  /**
   * Read as "not in effect right now" (an exact search ignores the period of
   * Entregas): the chosen option stays marked, toned down.
   */
  muted?: boolean;
  /** What follows the presets (Entregas' custom range). */
  children?: ReactNode;
}

/**
 * The period presets of a screen: the calendar icon and one button per
 * window, the chosen one marked.
 *
 * Atividades recentes had the only one (7 / 30 dias), and the product meeting
 * of 14/10/2026 named it the model for Entregas (Hoje / 7 / 14 / 30 dias /
 * Personalizado). One control, so the two screens read the same way.
 */
function PeriodSwitch<T extends string>({
  value,
  options,
  onChange,
  label,
  dataTutorial,
  disabled = false,
  muted = false,
  children,
}: PeriodSwitchProps<T>): JSX.Element {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-tutorial={dataTutorial}
      role="group"
      aria-label={label}
    >
      <CalendarRange
        className="h-4 w-4 text-muted-foreground"
        aria-hidden="true"
      />

      <div className="flex flex-wrap items-center gap-1">
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={selected ? "secondary" : "ghost"}
              className={cn(
                "h-8",
                selected && "font-medium",
                selected && muted && "opacity-60",
              )}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          );
        })}

        {children}
      </div>
    </div>
  );
}

export { PeriodSwitch, type PeriodSwitchOption };
