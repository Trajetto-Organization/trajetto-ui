import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { resolve } from "node:path";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  DateRangePicker,
  type DateRangePickerProps,
} from "@/app/(protected)/_components/shared/custom/date-range-picker";
import {
  clampLastShownMonth,
  dateToKey,
  keyToDate,
  lastShownMonth,
  pickRangeDay,
  rangeLength,
} from "@/app/(protected)/_components/shared/custom/date-range-picker/helpers";
import { INCOMPLETE_RANGE } from "@/app/(protected)/_components/shared/custom/date-range-picker/panel";
import { preloadCalendar } from "@/components/ui/lazy-calendar";
import {
  dayKeyIn,
  daysInclusive,
  formatDateKeyRange,
  isDateKey,
  shiftDateKey,
} from "@/lib/date-key";
import { customRangeProblem } from "@/features/deliveries/lib/period";
import { rangeIssue } from "@/features/driver-pauses/server-table";

import { inTimeZone } from "./helpers/in-time-zone";

/**
 * The shared range picker (decision of 28/10/2026): the custom period of
 * Entregas and the period of Pausas dos motoristas.
 *
 * Entregas' "Personalizado" opened two native date inputs — the browser's
 * glyph against the border, the browser's own picker — and Pausas had two
 * single-day fields on a line of their own. Both now open the product's
 * calendar in range mode. What must not change is what is sent: two civil
 * days, both included, refused past the screen's cap (92 / 31 days) in the
 * screen's own words, never a day the company has not reached.
 */
(globalThis as { React?: typeof React }).React = React;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(async () => {
  // The calendar is its own chunk (ui/lazy-calendar); loaded once here, the
  // popover opens straight on the grid, as it does after the hover.
  await preloadCalendar();
});

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

async function mount(element: ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(element));
}

async function click(element: Element): Promise<void> {
  await act(async () => {
    (element as HTMLElement).click();
  });
}

async function press(element: Element, key: string): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });
}

const button = (label: string) =>
  [...document.querySelectorAll("button")].find(
    (element) => (element.textContent ?? "").trim() === label,
  );

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');

/** The month grids on screen, by their caption ("outubro 2026"). */
const captions = () =>
  [...document.querySelectorAll('[role="grid"]')].map(
    (grid) =>
      document.getElementById(grid.getAttribute("aria-labelledby") ?? "")
        ?.textContent ?? "",
  );

function day(caption: string, date: number): HTMLButtonElement {
  const grid = [...document.querySelectorAll('[role="grid"]')].find(
    (candidate) =>
      document.getElementById(candidate.getAttribute("aria-labelledby") ?? "")
        ?.textContent === caption,
  );

  const found = [
    ...(grid?.querySelectorAll<HTMLButtonElement>('button[name="day"]') ?? []),
  ].find((candidate) => candidate.textContent === String(date));

  expect(found, `o dia ${date} de ${caption} não está na tela`).toBeTruthy();

  return found!;
}

const summary = () =>
  [...document.querySelectorAll("[data-date-range-summary] dd")].map(
    (value) => value.textContent,
  );

const alertText = () =>
  dialog()?.querySelector('[role="alert"]')?.textContent ?? null;

function picker(props: Partial<DateRangePickerProps> = {}) {
  const onApply = vi.fn();

  const element = createElement(DateRangePicker, {
    label: "Período personalizado",
    title: "Período personalizado",
    initialRange: { from: "2026-10-01", to: "2026-10-28" },
    maxDate: "2026-10-28",
    validate: customRangeProblem,
    hint: "Até 92 dias, pela data de criação da entrega.",
    onApply,
    children: createElement("button", { type: "button" }, "Abrir período"),
    ...props,
  });

  return { element, onApply };
}

async function open(): Promise<void> {
  await click(button("Abrir período")!);

  expect(dialog(), "o popover do período não abriu").not.toBeNull();
}

describe("the range, as civil days", () => {
  it("starts a new range after a complete one, closes an open one, and orders the ends", () => {
    expect(pickRangeDay({}, "2026-10-05")).toEqual({
      from: "2026-10-05",
      to: undefined,
    });
    expect(pickRangeDay({ from: "2026-10-05" }, "2026-10-12")).toEqual({
      from: "2026-10-05",
      to: "2026-10-12",
    });
    // A day before the first one becomes the start.
    expect(pickRangeDay({ from: "2026-10-12" }, "2026-10-05")).toEqual({
      from: "2026-10-05",
      to: "2026-10-12",
    });
    // The same day twice is one day.
    expect(pickRangeDay({ from: "2026-10-05" }, "2026-10-05")).toEqual({
      from: "2026-10-05",
      to: "2026-10-05",
    });
    // react-day-picker would shrink a complete range here; a third click
    // starts again instead.
    expect(
      pickRangeDay({ from: "2026-10-05", to: "2026-10-12" }, "2026-10-08"),
    ).toEqual({ from: "2026-10-08", to: undefined });
  });

  it("counts both ends and refuses what is not a day", () => {
    expect(daysInclusive("2026-10-01", "2026-10-01")).toBe(1);
    expect(daysInclusive("2026-10-01", "2026-12-31")).toBe(92);
    // Across the end of daylight saving time in São Paulo (it no longer
    // exists, but the arithmetic must not care).
    expect(daysInclusive("2026-02-14", "2026-02-16")).toBe(3);
    expect(rangeLength({ from: "2026-10-01", to: "2026-10-28" })).toBe(28);
    expect(rangeLength({ from: "2026-10-01" })).toBeNull();

    for (const bad of ["2026-02-30", "2026-13-01", "28/10/2026", "", null]) {
      expect(isDateKey(bad), String(bad)).toBe(false);
      expect(keyToDate(bad ?? undefined), String(bad)).toBeUndefined();
    }

    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(formatDateKeyRange("2026-10-01", "2026-10-28")).toBe(
      "01/10/2026 a 28/10/2026",
    );
    expect(formatDateKeyRange("2026-10-28", "2026-10-28")).toBe("28/10/2026");
  });

  it("hands the calendar the same day it sends back", () => {
    for (const key of ["2026-01-01", "2026-10-28", "2028-02-29"]) {
      expect(dateToKey(keyToDate(key)!)).toBe(key);
    }
  });

  it("names the company's day, not the browser's", () => {
    // 02:30 UTC on the 29th is still the 28th in São Paulo and Manaus.
    const instant = new Date("2026-10-29T02:30:00.000Z");

    expect(dayKeyIn(instant, "America/Sao_Paulo")).toBe("2026-10-28");
    expect(dayKeyIn(instant, "America/Manaus")).toBe("2026-10-28");
    expect(dayKeyIn(instant, "UTC")).toBe("2026-10-29");
    // A zone the browser does not know reads the browser's, not an error.
    expect(dayKeyIn(instant, "Mars/Olympus")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps the range's end in view and never shows a month past the bound", () => {
    expect(
      lastShownMonth({ from: "2026-09-20", to: "2026-10-05" }, "2026-10-28"),
    ).toEqual(new Date(2026, 9, 1));
    expect(lastShownMonth({}, "2026-10-28")).toEqual(new Date(2026, 9, 1));

    expect(
      clampLastShownMonth(new Date(2026, 11, 1), 2, undefined, "2026-10-28"),
    ).toEqual(new Date(2026, 9, 1));
    expect(
      clampLastShownMonth(new Date(2000, 0, 1), 2, "2000-01-01", undefined),
    ).toEqual(new Date(2000, 1, 1));
  });
});

/**
 * The conversion the picker relies on, in real zones (see inTimeZone): the
 * date field's `dateOnly` rules, from the most western zone to the most
 * eastern. A key that came back as the day before is the defect the old
 * native inputs never had and a calendar easily brings.
 */
describe("the day picked is the day sent, in any zone", () => {
  const HELPERS = resolve(
    "src/app/(protected)/_components/shared/custom/date-picker-field/helpers.ts",
  );
  const DATE_KEY = resolve("src/lib/date-key.ts");

  // Each zone is a fresh Node process that loads date-fns: 2–4 s alone, more
  // on a busy runner, so the default 5 s budget times out. Same budget as the
  // other per-test inTimeZone suites (verify-proof-entry).
  it.each([
    "Pacific/Pago_Pago",
    "America/Manaus",
    "America/Sao_Paulo",
    "UTC",
    "Asia/Tokyo",
    "Pacific/Kiritimati",
  ])(
    "%s",
    async (zone) => {
      const result = await inTimeZone<{
        roundTrip: string[];
        length: number;
        valid: boolean[];
      }>(
        zone,
        { helpers: HELPERS, keys: DATE_KEY },
        `
      const days = ["2026-01-01", "2026-02-28", "2026-10-28", "2026-12-31"];
      return {
        roundTrip: days.map((key) =>
          helpers.serializeDate(helpers.parseDateValue(key, true), true),
        ),
        length: keys.daysInclusive("2026-10-01", "2026-12-31"),
        valid: ["2026-02-28", "2026-02-29", "2028-02-29"].map(keys.isDateKey),
      };
      `,
      );

      expect(result.roundTrip).toEqual([
        "2026-01-01",
        "2026-02-28",
        "2026-10-28",
        "2026-12-31",
      ]);
      expect(result.length).toBe(92);
      expect(result.valid).toEqual([true, false, true]);
    },
    30_000,
  );
});

describe("the range picker", () => {
  it("opens on the range in effect, two months with its end in the last one", async () => {
    const { element } = picker();

    await mount(element);
    await open();

    expect(dialog()!.getAttribute("aria-label")).toBe("Período personalizado");
    expect(captions()).toEqual(["setembro 2026", "outubro 2026"]);
    expect(summary()).toEqual(["01/10/2026", "28/10/2026"]);

    expect(day("outubro 2026", 1).getAttribute("aria-selected")).toBe("true");
    expect(day("outubro 2026", 15).getAttribute("aria-selected")).toBe("true");
    expect(day("outubro 2026", 28).getAttribute("aria-selected")).toBe("true");
    expect(day("setembro 2026", 30).getAttribute("aria-selected")).toBeNull();

    // Nothing native left.
    expect(document.querySelector('input[type="date"]')).toBeNull();
  });

  it("never offers a day after the company's today", async () => {
    const { element } = picker();

    await mount(element);
    await open();

    expect(day("outubro 2026", 28).disabled).toBe(false);
    expect(day("outubro 2026", 29).disabled).toBe(true);
    expect(
      document.querySelector<HTMLButtonElement>('[aria-label="Próximo mês"]')
        ?.disabled,
    ).toBe(true);
  });

  it("builds a range in two clicks and applies both days at once", async () => {
    const { element, onApply } = picker();

    await mount(element);
    await open();

    await click(day("outubro 2026", 5));

    // The first click starts again: the range in effect was complete.
    expect(summary()).toEqual(["05/10/2026", "dd/mm/aaaa"]);
    expect(dialog()!.textContent).toContain("Agora escolha o dia final.");

    await click(day("setembro 2026", 28));

    // Clicked before the first day: it became the start.
    expect(summary()).toEqual(["28/09/2026", "05/10/2026"]);
    expect(dialog()!.textContent).toContain("8 dias no período.");
    expect(onApply).not.toHaveBeenCalled();

    await click(button("Aplicar")!);

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      from: "2026-09-28",
      to: "2026-10-05",
    });
    expect(dialog()).toBeNull();
  });

  it("takes the same day twice as a one-day period", async () => {
    const { element, onApply } = picker();

    await mount(element);
    await open();

    await click(day("outubro 2026", 20));
    await click(day("outubro 2026", 20));
    await click(button("Aplicar")!);

    expect(onApply).toHaveBeenCalledWith({
      from: "2026-10-20",
      to: "2026-10-20",
    });
  });

  it("refuses a range over Entregas' 92 days in its own words, and sends nothing", async () => {
    const { element, onApply } = picker({
      initialRange: { from: "2026-06-01", to: "2026-06-02" },
    });

    await mount(element);
    await open();

    expect(captions()).toEqual(["maio 2026", "junho 2026"]);

    await click(day("junho 2026", 1));

    // Two months ahead, then the 15th of September: 107 days.
    for (let step = 0; step < 3; step += 1) {
      await click(
        document.querySelector<HTMLButtonElement>(
          '[aria-label="Próximo mês"]',
        )!,
      );
    }

    expect(captions()).toEqual(["agosto 2026", "setembro 2026"]);

    await click(day("setembro 2026", 15));

    expect(alertText()).toBe(
      "O período personalizado pode ter no máximo 92 dias. Para um intervalo maior, exporte por partes.",
    );

    await click(button("Aplicar")!);

    expect(onApply).not.toHaveBeenCalled();
    expect(dialog()).not.toBeNull();

    // Live: a range inside the cap clears the message.
    await click(day("setembro 2026", 1));
    await click(day("setembro 2026", 30));

    expect(alertText()).toBeNull();
  });

  it("refuses a range over Pausas' 31 days in its own words", async () => {
    const { element, onApply } = picker({
      validate: rangeIssue,
      minDate: "2000-01-01",
      initialRange: { from: "2026-10-01", to: "2026-10-07" },
    });

    await mount(element);
    await open();

    await click(day("setembro 2026", 1));
    await click(day("outubro 2026", 15));

    expect(alertText()).toBe("O período pode ter no máximo 31 dias.");

    await click(button("Aplicar")!);

    expect(onApply).not.toHaveBeenCalled();
  });

  it("says what is missing when Aplicar finds one end only", async () => {
    // rangeIssue lets an open range through (it checks two days): the
    // panel still refuses it, in a sentence of its own.
    const { element, onApply } = picker({ validate: rangeIssue });

    await mount(element);
    await open();

    await click(day("outubro 2026", 3));

    // No error while the second day is being chosen…
    expect(alertText()).toBeNull();

    await click(button("Aplicar")!);

    // …but one when Aplicar is pressed without it.
    expect(alertText()).toBe(INCOMPLETE_RANGE);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("opens empty on dates that are not days, and on nothing", async () => {
    const { element } = picker({
      initialRange: { from: "2026-02-30", to: "2026-13-01" },
    });

    await mount(element);
    await open();

    expect(summary()).toEqual(["dd/mm/aaaa", "dd/mm/aaaa"]);
    expect(
      dialog()!.querySelectorAll('button[name="day"][aria-selected="true"]'),
    ).toHaveLength(0);
    // With nothing to show, the month of the latest day that may be picked.
    expect(captions()).toEqual(["setembro 2026", "outubro 2026"]);
  });

  it("leaves the period as it was on Cancelar, and opens on it again", async () => {
    const { element, onApply } = picker();

    await mount(element);
    await open();

    await click(day("outubro 2026", 5));
    await click(day("outubro 2026", 9));
    await click(button("Cancelar")!);

    expect(onApply).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();

    await open();

    expect(summary()).toEqual(["01/10/2026", "28/10/2026"]);
  });

  it("takes the keyboard: the grid has the focus, arrows move it, the focused day is picked", async () => {
    const { element, onApply } = picker({
      initialRange: { from: "2026-10-12", to: "2026-10-12" },
    });

    await mount(element);
    await open();

    // The first picked day takes the focus when the grid opens.
    expect(document.activeElement?.getAttribute("name")).toBe("day");
    expect(document.activeElement?.textContent).toBe("12");

    await press(document.activeElement!, "ArrowRight");
    expect(document.activeElement?.textContent).toBe("13");

    await press(document.activeElement!, "ArrowDown");
    expect(document.activeElement?.textContent).toBe("20");

    // Enter on a button is the browser's click.
    await click(document.activeElement!);
    await press(document.activeElement!, "ArrowLeft");
    await click(document.activeElement!);

    expect(summary()).toEqual(["19/10/2026", "20/10/2026"]);

    await click(button("Aplicar")!);

    expect(onApply).toHaveBeenCalledWith({
      from: "2026-10-19",
      to: "2026-10-20",
    });
  });

  it("shows one month on a phone", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("max-width"),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );

    const { element } = picker();

    await mount(element);
    await open();

    expect(captions()).toEqual(["outubro 2026"]);
    expect(
      dialog()!.querySelector("[data-date-range-panel]")?.className,
    ).toContain("w-[252px]");
  });
});
