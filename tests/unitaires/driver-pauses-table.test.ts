import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * The pause report's table and toolbar, rendered (decision 6.1): each row
 * reads its hours in the company's zone and explains its alerts, and the
 * period picked in the toolbar reaches the URL only when the API would
 * accept it, starting again on page 1.
 *
 * The period is the shared range picker (date-range-picker.test.ts covers
 * the widget); what is proven here is the toolbar's rule and its place on
 * the filters' line, beside Visualizar.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push, refresh: () => {} }),
  usePathname: () => "/dashboard/driver-pauses",
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DriverPausesTable } from "@/features/driver-pauses/table";
import type { DriverDayRow } from "@/features/driver-pauses/types";
import { preloadCalendar } from "@/components/ui/lazy-calendar";

(globalThis as { React?: typeof React }).React = React;

// The range picker's calendar is its own chunk (ui/lazy-calendar); loaded
// once here, the popover opens on the grid as it does after the hover.
beforeAll(async () => {
  await preloadCalendar();
});

let root: Root | null = null;

async function mount(element: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  return host;
}

async function click(element: Element): Promise<void> {
  await act(async () => {
    (element as HTMLElement).click();
  });
}

const button = (label: string) =>
  [...document.querySelectorAll("button")].find(
    (element) => (element.textContent ?? "").trim() === label,
  )!;

/** A day of a month grid in the open popover ("setembro 2026", 15). */
function calendarDay(caption: string, date: number): HTMLButtonElement {
  const grid = [...document.querySelectorAll('[role="grid"]')].find(
    (candidate) =>
      document.getElementById(candidate.getAttribute("aria-labelledby") ?? "")
        ?.textContent === caption,
  );

  const day = [
    ...(grid?.querySelectorAll<HTMLButtonElement>('button[name="day"]') ?? []),
  ].find((candidate) => candidate.textContent === String(date));

  expect(
    day,
    `o dia ${date} de ${caption} não está no calendário`,
  ).toBeTruthy();

  return day!;
}

const periodTrigger = () =>
  document.querySelector<HTMLButtonElement>("[data-pauses-period-trigger]")!;

const ROW: DriverDayRow = {
  id: "018f0000-0000-7000-8000-0000000000a1:2026-09-28",
  day: "2026-09-28",
  driverId: "018f0000-0000-7000-8000-0000000000a1",
  driverName: "Ana Souza",
  inProgress: true,
  workday: {
    start: "2026-09-28T11:00:00.000Z",
    end: "2026-09-28T19:00:00.000Z",
    minutes: 480,
  },
  pauses: [
    {
      id: "p1",
      kind: "MEAL",
      status: "ENDED",
      // 11:00 to 11:40 in Manaus (UTC-4).
      started_at: "2026-09-28T15:00:00.000Z",
      ended_at: "2026-09-28T15:40:00.000Z",
      duration_minutes: 40,
      note: "Almoço no posto",
      routeId: null,
    },
  ],
  totals: {
    pauseMinutes: 40,
    mealMinutes: 40,
    longestMealMinutes: 40,
    restMinutes: 0,
    otherMinutes: 0,
    drivingMinutes: 440,
    longestDrivingWithoutRestMinutes: 240,
  },
  previousWorkdayEnd: null,
  restBeforeMinutes: null,
  flags: [
    {
      code: "MEAL_SHORT",
      message:
        "A maior pausa de refeição durou 40 min. O intervalo para refeição é de no mínimo 1 hora.",
    },
  ],
};

function table(rows: DriverDayRow[] = [ROW]): ReactElement {
  return createElement(DriverPausesTable, {
    data: rows,
    meta: { total: 1, page: 1, pageSize: 10 },
    responseError: { error: false, errorMessage: "" },
    timeZone: "America/Manaus",
    period: { from: "2026-09-22", to: "2026-09-28" },
    searchMeta: {
      days: 1,
      drivers: 1,
      pauses: 1,
      daysWithAlerts: 1,
      facets: {
        driverId: [{ value: ROW.driverId, label: "Ana Souza", count: 1 }],
        flag: [{ value: "MEAL_SHORT", count: 1 }],
      },
    },
  });
}

beforeEach(() => {
  navigation.params = new URLSearchParams("page=3&flag=MEAL_SHORT");
  navigation.push.mockClear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("a row of the pause report", () => {
  it("reads the pause in the company's zone and explains the alert", async () => {
    const host = await mount(table());
    const text = host.textContent ?? "";

    expect(text).toContain("Ana Souza");
    expect(text).toContain("Refeição 11:00–11:40 · 40 min");
    expect(text).toContain("Almoço no posto");
    expect(text).toContain("Refeição curta");
    expect(text).toContain("A maior pausa de refeição durou 40 min");
    expect(text).toContain("Em andamento");
    // A day still going on ends "agora", not at the last event.
    expect(text).toContain("07:00–agora · 8 h");
  });

  it("names the end's day when a finished workday crosses the company's midnight", async () => {
    const host = await mount(
      table([
        {
          ...ROW,
          inProgress: false,
          // 19:00 on the 28th to 03:00 on the 29th in Manaus (UTC-4).
          workday: {
            start: "2026-09-28T23:00:00.000Z",
            end: "2026-09-29T07:00:00.000Z",
            minutes: 480,
          },
        },
      ]),
    );

    // It read "19:00–03:00", as if the day ran backwards.
    expect(host.textContent).toContain("19:00–29/09 às 03:00 · 8 h");
  });
});

describe("an empty report", () => {
  function empty(extra: { emptyMessage?: React.ReactNode } = {}): ReactElement {
    return createElement(DriverPausesTable, {
      data: [],
      meta: { total: 0, page: 1, pageSize: 10 },
      responseError: { error: false, errorMessage: "" },
      timeZone: "America/Manaus",
      period: { from: "2026-09-22", to: "2026-09-28" },
      ...extra,
    });
  }

  it("keeps the table's own sentence when the page has none (a filter that matched nothing)", async () => {
    const host = await mount(empty());

    expect(host.querySelector("tbody")?.textContent).toContain(
      "Nenhum resultado encontrado",
    );
  });

  it("says nothing of its own when the page already explains the empty period", async () => {
    // "Nenhuma jornada no período" above, then "Nenhum resultado encontrado"
    // inside the table: two messages for one fact.
    const host = await mount(empty({ emptyMessage: null }));

    expect(host.textContent).not.toContain("Nenhum resultado encontrado");
    expect(host.querySelectorAll("tbody tr")).toHaveLength(0);
    // The header stays, so the columns still say what the report holds.
    expect(host.querySelectorAll("thead th").length).toBeGreaterThan(0);
  });
});

describe("the period in the toolbar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts from the period the API answered", async () => {
    await mount(table());

    expect(periodTrigger().textContent).toBe("22/09/2026 a 28/09/2026");

    await click(periodTrigger());

    expect(
      [...document.querySelectorAll("[data-date-range-summary] dd")].map(
        (value) => value.textContent,
      ),
    ).toEqual(["22/09/2026", "28/09/2026"]);
    expect(calendarDay("setembro 2026", 22).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("refuses a period over 31 days on the spot and never asks the API", async () => {
    await mount(table());

    await click(periodTrigger());
    await click(calendarDay("agosto 2026", 1));
    await click(calendarDay("setembro 2026", 28));

    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "O período pode ter no máximo 31 dias.",
    );

    await click(button("Aplicar"));

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("puts a valid period in the URL in one go, keeps the filters and goes back to page 1", async () => {
    await mount(table());

    await click(periodTrigger());
    await click(calendarDay("setembro 2026", 1));

    // One end picked: nothing reloads yet (each field used to, on its own).
    expect(navigation.push).not.toHaveBeenCalled();

    await click(calendarDay("setembro 2026", 28));
    await click(button("Aplicar"));

    expect(navigation.push).toHaveBeenCalledTimes(1);

    const url = new URL(navigation.push.mock.calls[0][0], "http://web.test");

    expect(url.pathname).toBe("/dashboard/driver-pauses");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      flag: "MEAL_SHORT",
      from: "2026-09-01",
      to: "2026-09-28",
    });
  });

  it("ends at the company's today, not the browser's", async () => {
    // 02:30 UTC on the 29th: a browser in UTC is on the 29th, the company
    // in São Paulo still on the 28th.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-29T02:30:00.000Z"));

    await mount(
      createElement(DriverPausesTable, {
        data: [],
        meta: { total: 0, page: 1, pageSize: 10 },
        responseError: { error: false, errorMessage: "" },
        timeZone: "America/Sao_Paulo",
        period: { from: "2026-10-22", to: "2026-10-28" },
      }),
    );

    await click(periodTrigger());

    expect(calendarDay("outubro 2026", 28).disabled).toBe(false);
    expect(calendarDay("outubro 2026", 29).disabled).toBe(true);
  });

  it("sits beside Visualizar at the end of the filters' line", async () => {
    await mount(table());

    const end = document.querySelector<HTMLElement>("[data-toolbar-end]")!;

    expect(end, "o grupo do fim da barra não está na página").not.toBeNull();

    const period = end.querySelector('[data-tutorial="pauses-period"]');
    const view = end.querySelector('[data-tutorial="view-options"]');

    expect(period).not.toBeNull();
    expect(view).not.toBeNull();
    expect(
      period!.compareDocumentPosition(view!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // The filters come first, on the same toolbar line.
    const filters = end.parentElement!.querySelector(
      '[data-tutorial="pauses-filters"]',
    );

    expect(filters).not.toBeNull();
    expect(
      filters!.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // No single-day fields left with labels of their own.
    expect(document.querySelector("#driver-pauses-from")).toBeNull();
  });

  it("stays usable when the report failed, so a refused period can be fixed", async () => {
    navigation.params = new URLSearchParams("from=2026-09-01&to=2026-12-31");

    await mount(
      createElement(DriverPausesTable, {
        data: [],
        meta: { total: 0, page: 1, pageSize: 10 },
        responseError: {
          error: true,
          errorMessage: "O período pode ter no máximo 31 dias.",
        },
      }),
    );

    // Visualizar has no columns to toggle; the period stays.
    expect(document.querySelector('[data-tutorial="view-options"]')).toBeNull();
    expect(periodTrigger().disabled).toBe(false);
    // Read from the URL while the API has not answered one.
    expect(periodTrigger().textContent).toBe("01/09/2026 a 31/12/2026");
  });
});
