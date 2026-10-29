"use client";

import { useState, type ReactElement } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { warmCalendar } from "@/components/ui/lazy-calendar";

import { DateRangePanel, type DateRangePanelProps } from "./panel";

interface DateRangePickerProps extends Omit<
  DateRangePanelProps,
  "onCancel" | "onApply"
> {
  /** Told of the range once Aplicar accepts it; the popover closes. */
  onApply: (range: { from: string; to: string }) => void;

  /**
   * The trigger, rendered as the popover's own (asChild): Entregas' period
   * switch puts its "Personalizado" button here, Pausas a button with the
   * range in effect. One element that takes a ref.
   */
  children: ReactElement;

  /** The side of the trigger the popover lines up with. */
  align?: "start" | "center" | "end";

  /** The dialog's name for a screen reader ("Período personalizado"). */
  label: string;
}

/**
 * A period picked as a range of civil days, in a popover: the trigger the
 * screen chooses, the shared DateRangePanel inside.
 *
 * The panel mounts with the popover, so every opening starts from
 * `initialRange` — the period in effect — and a pick that was cancelled
 * leaves nothing behind. The calendar's chunk is asked for when the pointer
 * reaches the trigger or the trigger takes focus.
 */
const DateRangePicker = ({
  onApply,
  children,
  align = "end",
  label,
  ...panel
}: DateRangePickerProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        onPointerEnter={warmCalendar}
        onFocus={warmCalendar}
      >
        {children}
      </PopoverTrigger>

      <PopoverContent
        align={align}
        aria-label={label}
        // Radix flips to the side with more room but never shrinks the
        // content: on a short window (1440x900, the toolbar mid-page) the
        // two months were cut at the top. Capped to the room it has, it
        // scrolls instead.
        className="max-h-[var(--radix-popover-content-available-height)] w-auto overflow-y-auto p-3"
        // Never touching the window's edges.
        collisionPadding={16}
      >
        <DateRangePanel
          {...panel}
          onCancel={() => setOpen(false)}
          onApply={(range) => {
            setOpen(false);
            onApply(range);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

export { DateRangePicker };
export { DateRangePanel } from "./panel";
export type { DateRangePickerProps };
