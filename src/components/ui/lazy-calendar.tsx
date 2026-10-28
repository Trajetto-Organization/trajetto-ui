"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";

import { cn } from "@/lib/utils";

import type { CalendarProps } from "./calendar";

type CalendarModule = typeof import("./calendar");

/**
 * The calendar (react-day-picker and the date-fns functions it pulls, about
 * 16 KB gzipped) as its own chunk.
 *
 * Every date field imported it statically although it only ever renders
 * inside an open popover, so 23 protected routes carried it on first load —
 * the vehicle, driver and route lists among them, for a form field nobody
 * had opened. The fields render this instead and ask for the chunk when the
 * pointer reaches the trigger or the trigger takes focus (`preloadCalendar`),
 * so by the click it is usually there and the popover opens on the grid.
 *
 * Not React.lazy: a lazy component suspends on its first render even when
 * the module is already loaded, which flashed the placeholder every first
 * open. Here a loaded module renders synchronously, and only a cold open
 * shows the placeholder, sized like the grid so the popover does not jump.
 */
let loaded: CalendarModule | null = null;
let pending: Promise<CalendarModule> | null = null;

function preloadCalendar(): Promise<CalendarModule> {
  if (loaded) return Promise.resolve(loaded);

  pending ??= import("./calendar").then(
    (module) => {
      loaded = module;
      return module;
    },
    (error: unknown) => {
      // A failed chunk (a deploy replaced it, the network dropped) is asked
      // for again on the next open instead of being cached as a failure.
      pending = null;
      throw error;
    },
  );

  return pending;
}

/**
 * For a trigger's `onPointerEnter` / `onFocus`: start the download now and
 * stay quiet on failure — the open calendar reports it and tries again.
 */
function warmCalendar(): void {
  preloadCalendar().catch(() => undefined);
}

type LazyCalendarProps = CalendarProps & {
  /**
   * The placeholder's box while the chunk arrives: the grid's height and,
   * for a range of two months, its width.
   */
  loadingClassName?: string;
};

function LazyCalendar(props: LazyCalendarProps): JSX.Element {
  const [module, setModule] = useState<CalendarModule | null>(loaded);
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    if (module) return;

    let alive = true;

    preloadCalendar().then(
      (next) => {
        if (alive) setModule(next);
      },
      () => {
        if (alive) setFailed(true);
      },
    );

    return () => {
      alive = false;
    };
  }, [module]);

  const { loadingClassName, ...calendarProps } = props;

  if (module) {
    const { Calendar } = module;

    return <Calendar {...(calendarProps as CalendarProps)} />;
  }

  return (
    <div
      data-calendar-loading
      role="status"
      aria-live="polite"
      className={cn(
        "flex h-[18rem] w-full items-center justify-center text-sm text-muted-foreground",
        loadingClassName,
      )}
    >
      {failed ? (
        "Não foi possível abrir o calendário. Feche e abra de novo."
      ) : (
        <>
          <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span className="sr-only">Carregando o calendário</span>
        </>
      )}
    </div>
  );
}

export { LazyCalendar, preloadCalendar, warmCalendar };
export type { LazyCalendarProps };
