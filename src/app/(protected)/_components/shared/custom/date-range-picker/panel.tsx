"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { LazyCalendar } from "@/components/ui/lazy-calendar";

import { dayKeyIn, formatDateKey, isDateKey } from "@/lib/date-key";
import { cn } from "@/lib/utils";

import { pickerYears } from "../date-picker-field/helpers";
import { MonthYearSelects } from "../date-picker-field/month-year-selects";

import {
  addMonthsTo,
  clampLastShownMonth,
  dateToKey,
  keyToDate,
  lastShownMonth,
  pickRangeDay,
  rangeLength,
  type DateKeyRange,
} from "./helpers";

/** Below `sm` the popover shows one month: two do not fit a phone. */
const NARROW_QUERY = "(max-width: 639px)";

function subscribeNarrow(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW_QUERY);

  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
}

/**
 * Read on the first render, not after it: the panel only exists in an open
 * popover (never on the server), so a phone never draws two months first
 * and then one.
 */
function useNarrowViewport(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

const INCOMPLETE_RANGE = "Escolha o dia inicial e o dia final do período.";

interface DateRangePanelProps {
  /** The range the panel opens on: the one in effect, or a sensible one. */
  initialRange: DateKeyRange;

  /** The first and last days that can be picked ("YYYY-MM-DD"). */
  minDate?: string;
  maxDate?: string;

  /**
   * Why a range cannot be applied, in the screen's own words (the API's),
   * or null. A range with a missing end that the rule lets through still
   * cannot be applied.
   */
  validate: (from: string | undefined, to: string | undefined) => string | null;

  /** The rule under the calendar while nothing is wrong. */
  hint?: ReactNode;

  /** The panel's heading. */
  title: string;

  onApply: (range: { from: string; to: string }) => void;
  onCancel: () => void;
}

/**
 * The body of a period popover: what is picked (De / Até), the calendar in
 * range mode, the rule or what is wrong with the pick, Cancelar and Aplicar.
 *
 * It replaced two native `<input type="date">` in Entregas — 140px boxes
 * with the browser's glyph against the border and the browser's own picker —
 * and the two single-day fields of Pausas. Days are civil days end to end:
 * the calendar's local dates are converted with the date field's `dateOnly`
 * rules, never through UTC.
 *
 * Nothing is applied until Aplicar, so a range can be built in two clicks
 * without the page reloading in between, and Escape or Cancelar leave the
 * period as it was. The calendar's grid takes the keyboard (arrows, PageUp /
 * PageDown, Home / End, Enter).
 */
const DateRangePanel = ({
  initialRange,
  minDate,
  maxDate,
  validate,
  hint,
  title,
  onApply,
  onCancel,
}: DateRangePanelProps): JSX.Element => {
  const id = useId();
  const titleId = `${id}-title`;
  const problemId = `${id}-problem`;
  const hintId = `${id}-hint`;

  const months = useNarrowViewport() ? 1 : 2;

  const [range, setRange] = useState<DateKeyRange>(() => ({
    from: isDateKey(initialRange.from) ? initialRange.from : undefined,
    to: isDateKey(initialRange.to) ? initialRange.to : undefined,
  }));

  // An Aplicar refused with an open range: from then on its message shows
  // until the next pick.
  const [attempted, setAttempted] = useState<boolean>(false);

  const fallbackKey = maxDate ?? dayKeyIn(new Date());

  const [lastMonth, setLastMonth] = useState<Date>(() =>
    lastShownMonth(range, fallbackKey),
  );

  const visibleLast = clampLastShownMonth(lastMonth, months, minDate, maxDate);
  const visibleFirst = addMonthsTo(visibleLast, -(months - 1));

  const complete = Boolean(range.from && range.to);

  const problemOf = (next: DateKeyRange): string | null =>
    validate(next.from, next.to) ??
    (next.from && next.to ? null : INCOMPLETE_RANGE);

  // Live once the range is whole (decision 16.700): the message follows the
  // days and goes when they are right. While the second day is being
  // chosen, the instruction shows instead of an error.
  const problem = complete || attempted ? problemOf(range) : null;

  const length = rangeLength(range);

  const pick = (day: Date) => {
    setRange((current) => pickRangeDay(current, dateToKey(day)));
    setAttempted(false);
  };

  const apply = () => {
    const found = problemOf(range);

    if (found || !range.from || !range.to) {
      setAttempted(true);
      return;
    }

    onApply({ from: range.from, to: range.to });
  };

  const years = pickerYears(
    Number(fallbackKey.slice(0, 4)),
    false,
    visibleLast.getFullYear(),
  ).filter(
    (year) => !isDateKey(minDate) || year >= Number(minDate.slice(0, 4)),
  );

  const status = !range.from
    ? "Escolha o dia inicial."
    : !range.to
      ? "Agora escolha o dia final."
      : `${length} ${length === 1 ? "dia" : "dias"} no período.`;

  return (
    <div
      // The grid's own width: 7 days of 36px a month, 16px between two.
      // Radix sizes the popover to its content's max-content, so without a
      // width the sentence under the calendar would widen it to one line.
      className={cn(
        "flex flex-col gap-3",
        months === 2 ? "w-[520px]" : "w-[252px]",
      )}
      role="group"
      aria-labelledby={titleId}
      data-date-range-panel
    >
      {/* The trigger already says which period this is; the heading names
          the group for a screen reader without taking a line. */}
      <p id={titleId} className="sr-only">
        {title}
      </p>

      {/* What is picked, said again after every click. The end still to be
          picked is outlined. */}
      <dl
        className="grid grid-cols-2 gap-2"
        aria-live="polite"
        data-date-range-summary
      >
        {(
          [
            ["De", range.from, !range.from],
            ["Até", range.to, Boolean(range.from) && !range.to],
          ] as const
        ).map(([label, value, next]) => (
          <div
            key={label}
            className={cn(
              "flex min-w-0 rounded-md border border-input bg-background px-2",
              // One line beside two months; on a phone (one month, 122px a
              // box) the label goes above, or the year was cut.
              months === 2
                ? "h-8 items-center gap-1.5"
                : "flex-col justify-center py-1",
              next && "border-primary ring-1 ring-primary",
              problem && complete && "border-red-600 dark:border-red-500",
            )}
          >
            <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                "min-w-0 truncate text-sm font-medium tabular-nums",
                !value && "font-normal text-muted-foreground",
              )}
            >
              {value ? formatDateKey(value) : "dd/mm/aaaa"}
            </dd>
          </div>
        ))}
      </dl>

      <MonthYearSelects
        year={visibleLast.getFullYear()}
        month={visibleLast.getMonth()}
        years={years}
        onYearChange={(year) =>
          setLastMonth(new Date(Number(year), visibleLast.getMonth(), 1))
        }
        onMonthChange={(month) =>
          setLastMonth(new Date(visibleLast.getFullYear(), Number(month), 1))
        }
        triggerClassName="h-8"
      />

      <LazyCalendar
        mode="range"
        // Up to six weeks, the head and the caption.
        loadingClassName="h-[17.5rem]"
        className="p-0"
        classNames={{ months: "flex flex-row gap-4" }}
        numberOfMonths={months}
        month={visibleFirst}
        onMonthChange={(first) => setLastMonth(addMonthsTo(first, months - 1))}
        selected={{ from: keyToDate(range.from), to: keyToDate(range.to) }}
        // The picker's own range arithmetic is replaced by pickRangeDay.
        onSelect={(_range, day) => pick(day)}
        // Outside days would show the picked range twice, once muted, in
        // the neighbouring month.
        showOutsideDays={false}
        fromDate={keyToDate(minDate)}
        toDate={keyToDate(maxDate)}
        locale={ptBR}
        initialFocus
      />

      {problem ? (
        <p
          id={problemId}
          role="alert"
          className="text-xs text-red-600 dark:text-red-500"
        >
          {problem}
        </p>
      ) : (
        <p
          id={hintId}
          className="text-xs text-muted-foreground"
          data-date-range-hint
        >
          <span>{status}</span>
          {hint && <span> {hint}</span>}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          onClick={apply}
          aria-describedby={problem ? problemId : hintId}
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
};

export { DateRangePanel, INCOMPLETE_RANGE };
export type { DateRangePanelProps };
