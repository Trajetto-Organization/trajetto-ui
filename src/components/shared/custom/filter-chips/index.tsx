"use client";

import { cn } from "@/lib/utils";

/**
 * Picking one of a few filters, inside a panel.
 *
 * Three panels had their own row of `<Button variant={active ? "default" :
 * "outline"}>`, which means the selected filter was painted as a PRIMARY
 * BUTTON — the same solid dark pill as "Nova chave" and "Nova Entrega" right
 * beside it. A filter that looks like the page's main action is a filter
 * people press by mistake, and a page with four primary buttons has none.
 *
 * The visual language here is the segmented strip the product already uses for
 * sections: a muted track, the chosen one lifted out of it. Same idea, so it
 * reads as the same kind of choice — but built from buttons with
 * `aria-pressed`, because these change state in place and navigate nowhere.
 */
interface FilterChipOption<T extends string> {
  value: T;
  label: string;

  /** Shown after the label. `undefined` renders nothing, `0` renders "0". */
  count?: number;
}

interface FilterChipsProps<T extends string> {
  /** Names the group for a screen reader: "Situação", "Período". */
  label: string;

  value: T;
  options: ReadonlyArray<FilterChipOption<T>>;

  disabled?: boolean;
  className?: string;

  onChange: (value: T) => void;
}

const FilterChips = <T extends string>({
  label,
  value,
  options,
  disabled = false,
  className,
  onChange,
}: FilterChipsProps<T>): JSX.Element => (
  <div
    role="group"
    aria-label={label}
    className={cn(
      "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-md bg-muted p-1",
      className,
    )}
  >
    {options.map((option) => {
      const isActive = option.value === value;

      return (
        <button
          key={option.value}
          type="button"
          // Not `aria-current`: nothing here is a location. These are toggles
          // in a group, and exactly one is pressed.
          aria-pressed={isActive}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap
            rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground
            ring-offset-background transition-all focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-ring
            focus-visible:ring-offset-2 disabled:pointer-events-none
            disabled:opacity-50`,
            isActive && "bg-background text-foreground shadow-sm",
          )}
        >
          <span>{option.label}</span>

          {option.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-xs tabular-nums",
                isActive
                  ? "bg-muted text-muted-foreground"
                  : "bg-background/60 text-muted-foreground",
              )}
            >
              {option.count.toLocaleString("pt-BR")}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export { FilterChips };
export type { FilterChipOption };
