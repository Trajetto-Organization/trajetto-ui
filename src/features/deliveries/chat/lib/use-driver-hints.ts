"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DriverHints {
  /** driverId → true while the hint is lit for that driver. */
  active: Record<string, boolean>;

  /**
   * Lights the hint for a driver and re-arms its expiry, or puts it out at
   * once when the other side says it stopped.
   *
   * Every pulse goes through here, and re-arming on each one is what the
   * whole thing rests on: `on` is fresh evidence, never a new hint.
   */
  mark: (driverId: string, on: boolean) => void;
}

/**
 * The receiving half of an ephemeral hint, for one kind of hint.
 *
 * "Digitando" and "gravando" travel as two events by contract — they can be
 * true at the same instant, so a single flag could never carry both — but
 * everything on THIS side is the same work: light it for a driver, arm a
 * timer, put it out if nothing else arrives. That work lives here once and
 * is used twice, rather than being written a second time for the new hint.
 *
 * Both are pulses, so the timer is the MECHANISM and not a net: the other
 * side keeps a hint alive by repeating it, and the only thing that ends one
 * is the repeating stopping. That is why a lost `false`, a dropped socket
 * and a closed tab all need no handling of any kind here — none of them can
 * keep sending.
 *
 * `visibleMs` is the whole of the difference between the two, and the
 * reason it is a parameter instead of a constant: each hint pulses on its
 * own beat and so each needs a window measured against that beat. Both
 * numbers, and why they are what they are, live in `chat-hints`.
 */
function useDriverHints(visibleMs: number): DriverHints {
  const [active, setActive] = useState<Record<string, boolean>>({});

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const putOut = useCallback((driverId: string) => {
    clearTimeout(timers.current[driverId]);
    delete timers.current[driverId];

    setActive((current) => {
      // Same object back when there was nothing lit: an event that changes
      // nothing must not re-render the whole conversation list.
      if (!current[driverId]) return current;

      const next = { ...current };

      delete next[driverId];
      return next;
    });
  }, []);

  const mark = useCallback(
    (driverId: string, on: boolean) => {
      if (!on) {
        putOut(driverId);
        return;
      }

      setActive((current) =>
        current[driverId] ? current : { ...current, [driverId]: true },
      );

      // Re-armed even when the flag was already lit: every pulse that
      // arrives is fresh evidence, and the point of the timer is to measure
      // silence rather than the age of the first hint.
      clearTimeout(timers.current[driverId]);

      // The mechanism, not a net: this is what ends the hint in the
      // ordinary case, and an explicit "stopped" from the other side is
      // only ever a shortcut to it. Sized in `chat-hints` to outlast one
      // late pulse and no more.
      timers.current[driverId] = setTimeout(() => putOut(driverId), visibleMs);
    },
    [putOut, visibleMs],
  );

  // A timer that outlives the panel fires into a component that is gone.
  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    },
    [],
  );

  return { active, mark };
}

export { useDriverHints };
export type { DriverHints };
