import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The pause report's table and toolbar, rendered (decision 6.1): each row
 * reads its hours in the company's zone and explains its alerts, and the
 * period picked in the toolbar reaches the URL only when the API would
 * accept it, starting again on page 1.
 *
 * The date picker is a stand-in input: what is proven is the toolbar's rule,
 * not the calendar widget (tested with the shared fields).
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

vi.mock(
  "@/app/(protected)/_components/shared/custom/date-picker-field",
  async () => {
    const { createElement: h } = await import("react");

    return {
      DatePickerField: ({
        label,
        value,
        onChange,
        errorName,
      }: {
        label: string;
        value?: string;
        onChange?: (value: string) => void;
        errorName?: string[];
      }) =>
        h(
          "div",
          null,
          h("input", {
            "data-field": label,
            value: value ?? "",
            onChange: (event: { target: { value: string } }) =>
              onChange?.(event.target.value),
          }),
          errorName
            ? h("span", { "data-field-error": label }, errorName[0])
            : null,
        ),
    };
  },
);

import { DriverPausesTable } from "@/features/driver-pauses/table";
import type { DriverDayRow } from "@/features/driver-pauses/types";

(globalThis as { React?: typeof React }).React = React;

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

async function type(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;

  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

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
  it("starts from the period the API answered", async () => {
    const host = await mount(table());

    const from = host.querySelector<HTMLInputElement>('[data-field="De"]')!;
    const to = host.querySelector<HTMLInputElement>('[data-field="Até"]')!;

    expect(from.value).toBe("2026-09-22");
    expect(to.value).toBe("2026-09-28");
  });

  it("refuses an inverted period on the spot and never asks the API", async () => {
    const host = await mount(table());

    await type(
      host.querySelector<HTMLInputElement>('[data-field="De"]')!,
      "2026-09-30",
    );

    expect(host.querySelector('[data-field-error="De"]')?.textContent).toBe(
      "A data inicial deve ser anterior ou igual à final.",
    );
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("puts a valid period in the URL, keeps the filters and goes back to page 1", async () => {
    const host = await mount(table());

    await type(
      host.querySelector<HTMLInputElement>('[data-field="De"]')!,
      "2026-09-01",
    );

    expect(navigation.push).toHaveBeenCalledTimes(1);

    const url = new URL(navigation.push.mock.calls[0][0], "http://web.test");

    expect(url.pathname).toBe("/dashboard/driver-pauses");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      flag: "MEAL_SHORT",
      from: "2026-09-01",
      to: "2026-09-28",
    });
  });
});
