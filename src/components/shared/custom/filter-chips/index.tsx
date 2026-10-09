"use client";

import { ScrollableTabs } from "@/components/ui/scrollable-tabs";

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
  <ScrollableTabs
    role="group"
    aria-label={label}
    tone="muted"
    wrapperClassName={className}
    /*
      One line that scrolls with the product's own faded edges and arrows —
      the tab standard (decision 3.1), not a second line.

      It wrapped for a while, to dodge the operating system's scrollbar drawn
      inside a 40px rail; the user asked for the chips of Monitor de envios,
      Uso da API and Auditoria de comprovantes to behave exactly like the
      section tabs instead. The rail hides the native bar, so neither defect
      comes back.
    */
    className="h-10 items-center gap-1 rounded-md bg-muted p-1"
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
            /*
              `px-2` on a phone, `px-3` from `sm`: eight pixels a chip is what
              lets "Na fila" and "Aprovados" both show at 320px before the
              rail has to scroll to the third.
            */
            `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap
            rounded-sm px-2 py-1.5 text-sm font-medium text-muted-foreground
            ring-offset-background transition-all focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-ring
            focus-visible:ring-offset-2 disabled:pointer-events-none
            disabled:opacity-50 sm:px-3`,
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
  </ScrollableTabs>
);

export { FilterChips };
export type { FilterChipOption };
