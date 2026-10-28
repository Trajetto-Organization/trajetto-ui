import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { resolve } from "node:path";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The shared form fields, rendered (decisions 3.3, 3.4 and 3.9).
 *
 * - The neighbour of a field in error must not drop: the shell packs its
 *   tracks to the top instead of stretching them with the row.
 * - The error is under the field, at most two lines, full text in `title`
 *   and in `aria-describedby`.
 * - `Nome *` has one space and a red, aria-hidden star; the control carries
 *   `aria-required`; `(opcional)` is always lower case.
 * - Every kind of field gets the wiring, the comboboxes included — they were
 *   the last ones still replacing the label with the error.
 * - Date fields have the calendar at the END and a pointer.
 *
 * The rendered assertions hold in whatever zone the runner is in (CI runs in
 * UTC, this machine in UTC-3): expected instants are built with the same
 * local constructors a person's clock implies. What only a real zone can
 * show (a civil day that must not slip west of UTC, 08:30 in Rio Branco
 * being 13:30Z) runs in child processes started in those zones, at the end.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock(
  "@/app/(protected)/_components/shared/searches/search-business/hooks/business-infinite-scroll",
  () => ({
    useBusinessInfiniteScroll: () => ({
      business: [{ id: "b1", corporate_reason: "Transportes Silva" }],
      lastElementRef: () => {},
      isLoading: false,
      isFetching: false,
      refetch: () => {},
      hasError: false,
      errorMessage: null,
    }),
  }),
);

import FormInput from "@/components/shared/custom/form-input";
import { TextareaField } from "@/components/shared/custom/textarea-field";
import {
  FieldShell,
  parseFieldLabel,
  type FieldControlProps,
} from "@/components/shared/custom/field-shell";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { SearchBusiness } from "@/app/(protected)/_components/shared/searches/search-business";
import { DateTimePickerField } from "@/app/(protected)/_components/shared/custom/date-time-picker-field";
import {
  parseDateValue,
  serializeDate,
} from "@/app/(protected)/_components/shared/custom/date-picker-field/helpers";
import {
  formatLocalDateTime,
  localPartsFromIso,
  minuteOptions,
  toIsoFromLocalParts,
} from "@/app/(protected)/_components/shared/custom/date-time-picker-field/helpers";

import { preloadCalendar } from "@/components/ui/lazy-calendar";

import { inTimeZone } from "./helpers/in-time-zone";

// This runner compiles JSX with the classic runtime; the app's components
// (built for Next's automatic runtime) find `React` as a global at render.
(globalThis as { React?: typeof React }).React = React;

// The date fields' calendar is its own chunk (ui/lazy-calendar); loaded here
// once, a picker opens on the grid as it does after the trigger's hover.
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

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("the label", () => {
  it.each([
    ["Destinatário *", "Destinatário", true],
    ["Embarcador*", "Embarcador", true],
    ["Cor da Coluna*", "Cor da Coluna", true],
    ["Nome fantasia (opcional)", "Nome fantasia (opcional)", false],
    ["Observações (Opcional)", "Observações (opcional)", false],
    ["Localização ( OPCIONAL )", "Localização (opcional)", false],
    ["Senha", "Senha", false],
  ])("%s → text %j, required %s", (label, text, required) => {
    expect(parseFieldLabel(label)).toEqual({ text, required });
  });

  it('"Nome*" and "Nome *" render the same: a space and the red star hidden from screen readers', async () => {
    const host = await mount(
      createElement(
        "div",
        null,
        createElement(FormInput, { label: "Embarcador*", htmlfor: "a" }),
        createElement(FormInput, { label: "Destinatário *", htmlfor: "b" }),
      ),
    );

    const [first, second] = Array.from(host.querySelectorAll("label"));

    expect(first.textContent).toBe("Embarcador *");
    expect(second.textContent).toBe("Destinatário *");

    const star = first.querySelector("span")!;

    expect(star.textContent).toBe("*");
    expect(star.getAttribute("aria-hidden")).toBe("true");
    expect(star.className).toContain("text-red-600");

    // A label cut by a narrow column can still be read.
    expect(first.getAttribute("title")).toBe("Embarcador");
  });
});

describe("the required field and the field with an error", () => {
  it("marks aria-required on the control of a field with *", async () => {
    const host = await mount(
      createElement(FormInput, { label: "Razão Social *", htmlfor: "name" }),
    );

    expect(host.querySelector("input")!.getAttribute("aria-required")).toBe(
      "true",
    );
  });

  it("does not mark aria-required on an optional field", async () => {
    const host = await mount(
      createElement(FormInput, {
        label: "Nome fantasia (opcional)",
        htmlfor: "fantasy",
      }),
    );

    expect(host.querySelector("input")!.hasAttribute("aria-required")).toBe(
      false,
    );
  });

  it("shows the error below, in up to two lines, with the full text in title and aria-describedby", async () => {
    const message =
      "O CNPJ deve ter exatamente 14 dígitos e pertencer a uma empresa ativa na Receita Federal.";

    const host = await mount(
      createElement(FormInput, {
        label: "CNPJ *",
        htmlfor: "cnpj",
        errorName: [message],
        hint: "Só os números.",
      }),
    );

    const input = host.querySelector("input")!;
    const error = host.querySelector('[role="alert"]')!;

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("cnpj-error cnpj-hint");

    expect(error.id).toBe("cnpj-error");
    expect(error.getAttribute("title")).toBe(message);
    expect(error.textContent).toBe(message);
    expect(error.className).toContain("line-clamp-2");

    // The label is still there — the error no longer replaces it.
    expect(host.querySelector("label")!.textContent).toBe("CNPJ *");

    // The red border stays while the person is fixing the field.
    expect(input.className).not.toContain("focus-visible:border-none");
  });

  it("packs label and control at the top, so the neighbour of a field with an error does not drop", async () => {
    const host = await mount(
      createElement(FieldShell, {
        label: "Nome fantasia (opcional)",
        htmlFor: "x",
        children: (control: FieldControlProps) =>
          createElement("input", control),
      }),
    );

    const shell = host.firstElementChild as HTMLElement;
    const inner = host.querySelector("input")!.parentElement as HTMLElement;

    expect(shell.className.split(/\s+/)).toContain("content-start");
    expect(inner.className.split(/\s+/)).toContain("content-start");
  });
});

describe("the long text field", () => {
  it("has the same label, error and aria as the other fields", async () => {
    const host = await mount(
      createElement(TextareaField, {
        label: "Motivo do cancelamento *",
        htmlfor: "reason",
        errorName: ["Descreva o motivo."],
        hint: "Fica registrado na rota e no histórico da operação.",
      }),
    );

    const textarea = host.querySelector("textarea")!;

    expect(host.querySelector("label")!.textContent).toBe(
      "Motivo do cancelamento *",
    );
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.getAttribute("aria-required")).toBe("true");
    expect(textarea.getAttribute("aria-describedby")).toBe(
      "reason-error reason-hint",
    );
    expect(textarea.className).toContain("border-red-600");
  });
});

describe("the date field", () => {
  it("has the icon at the end, a pointer cursor and the aria of the other fields", async () => {
    const host = await mount(
      createElement(DatePickerField, {
        label: "Data da rota *",
        htmlfor: "scheduled",
        name: "scheduled_date",
        errorName: ["Informe a data da rota."],
      }),
    );

    const trigger = host.querySelector("button")!;

    expect(trigger.className).toContain("cursor-pointer");
    expect(trigger.className).toContain("justify-between");

    // The calendar glyph is the LAST thing in the field, like a select's
    // chevron — it used to open the field.
    expect(trigger.lastElementChild!.tagName.toLowerCase()).toBe("svg");
    expect(trigger.firstElementChild!.tagName.toLowerCase()).toBe("span");

    expect(trigger.getAttribute("aria-required")).toBe("true");
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(trigger.getAttribute("aria-describedby")).toBe("scheduled-error");
  });
});

describe("the date field without time (decision 1.3)", () => {
  it("reads the civil day stored as UTC midnight, without going back a day in Brazil's zone", async () => {
    const host = await mount(
      createElement(DatePickerField, {
        label: "Data da rota *",
        htmlfor: "route-day",
        name: "scheduled_date",
        value: "2026-09-17T00:00:00.000Z",
        allowFutureDates: true,
        dateOnly: true,
      }),
    );

    expect(host.querySelector("button")!.textContent).toContain("17/09/2026");
  });

  it("reads and writes YYYY-MM-DD", () => {
    const day = parseDateValue("2026-09-17", true)!;

    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([
      2026, 8, 17,
    ]);
    expect(serializeDate(day, true)).toBe("2026-09-17");
  });

  it("without dateOnly still sends the instant, as the fleet forms expect", () => {
    const day = parseDateValue("2026-09-17", false)!;

    // Local midnight of the 17th as an instant (03:00Z in São Paulo; the
    // per-zone values are at the end of this file).
    expect(serializeDate(day, false)).toBe(new Date(2026, 8, 17).toISOString());
  });
});

describe("the step search comboboxes", () => {
  it("keep the label, put the error below and mark the search as invalid and required", async () => {
    const host = await mount(
      createElement(SearchBusiness, {
        errorBusinessId: ["A empresa é obrigatória!"],
        searchBusinessInputValue: "",
        handleUpdateSearchBussinessInputValue: () => {},
      }),
    );

    // The old pattern: the red error text sat where the label was.
    const label = host.querySelector("label:not([cmdk-label])")!;

    expect(label.textContent).toBe("Selecione a empresa *");

    const input = host.querySelector("input[cmdk-input]")!;
    const error = host.querySelector('[role="alert"]')!;

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
    expect(error.textContent).toBe("A empresa é obrigatória!");

    // cmdk names the input through its own hidden label.
    expect(host.querySelector("label[cmdk-label]")!.textContent).toBe(
      "Selecione a empresa",
    );
    expect(
      document.getElementById(input.getAttribute("aria-labelledby")!)!
        .textContent,
    ).toBe("Selecione a empresa");
  });

  it("do not leave a label pointing at an id that does not exist", async () => {
    const host = await mount(
      createElement(SearchBusiness, {
        errorBusinessId: ["A empresa é obrigatória!"],
        searchBusinessInputValue: "",
        handleUpdateSearchBussinessInputValue: () => {},
      }),
    );

    // cmdk overwrites the input's id with its own, so the visible label's
    // `for` used to point at nothing.
    for (const label of Array.from(host.querySelectorAll("label[for]"))) {
      expect(
        document.getElementById(label.getAttribute("for")!),
        `o rótulo "${label.textContent}" aponta para um id que não existe`,
      ).not.toBeNull();
    }

    expect(
      host.querySelector("label:not([cmdk-label])")!.hasAttribute("for"),
    ).toBe(false);

    expect(await ariaViolations(host)).toEqual([]);
  });
});

/** 17/09/2026 at `hour`:`minute` on the runner's clock, as the API gets it. */
const onLocalClock = (hour: number, minute: number): string =>
  new Date(2026, 8, 17, hour, minute).toISOString();

describe("date and time (decision 1.4)", () => {
  it("sends the local instant with an offset", () => {
    const iso = toIsoFromLocalParts({
      date: new Date(2026, 8, 17),
      hour: 8,
      minute: 30,
    });

    expect(iso).toMatch(/Z$/);
    expect(iso).toBe(onLocalClock(8, 30));
  });

  it("reads back in the browser's zone", () => {
    const parts = localPartsFromIso(onLocalClock(8, 30))!;

    expect(parts.hour).toBe(8);
    expect(parts.minute).toBe(30);
    expect(formatLocalDateTime(parts)).toBe("17/09/2026 às 08:30");
  });

  it("refuses a time without an offset instead of guessing the zone", () => {
    expect(localPartsFromIso("2026-09-17T08:30")).toBeNull();
    expect(localPartsFromIso("")).toBeNull();
    expect(localPartsFromIso("não é data")).toBeNull();
  });

  it("keeps a minute off the grid so the saved value is not rewritten", () => {
    expect(minuteOptions(15)).toEqual([0, 15, 30, 45]);
    expect(minuteOptions(15, 7)).toEqual([0, 7, 15, 30, 45]);
  });

  it("the field carries the ISO in the FormData and shows date and time with the icon at the end", async () => {
    const host = await mount(
      createElement(DateTimePickerField, {
        label: "Saída prevista (opcional)",
        htmlfor: "departure",
        name: "planned_departure_at",
        value: onLocalClock(8, 30),
        onChange: () => {},
      }),
    );

    const hidden = host.querySelector(
      'input[name="planned_departure_at"]',
    ) as HTMLInputElement;

    expect(hidden.type).toBe("hidden");
    expect(hidden.value).toBe(onLocalClock(8, 30));

    const trigger = host.querySelector("button")!;

    expect(trigger.textContent).toContain("17/09/2026 às 08:30");
    expect(trigger.className).toContain("cursor-pointer");
    expect(trigger.lastElementChild!.tagName.toLowerCase()).toBe("svg");

    // No native datetime-local anywhere.
    expect(host.querySelector('input[type="datetime-local"]')).toBeNull();
  });
});

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

/** Opens the picker and picks a day of the month on screen. */
async function pickDay(trigger: Element, day: string): Promise<void> {
  await click(trigger);

  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '[role="dialog"] button[name="day"]',
    ),
  ).find((candidate) => candidate.textContent === day && !candidate.disabled);

  expect(button, `o dia ${day} não está no calendário aberto`).toBeTruthy();

  await click(button!);
}

/** Chooses a value in one of the picker's time selects, by keyboard. */
async function chooseTime(selectLabel: string, option: string): Promise<void> {
  const trigger = document.querySelector(`[aria-label="${selectLabel}"]`)!;

  await press(trigger, "Enter");

  const item = Array.from(document.querySelectorAll('[role="option"]')).find(
    (candidate) => candidate.textContent === option,
  );

  expect(item, `a opção ${option} não abriu em ${selectLabel}`).toBeTruthy();

  await press(item!, "Enter");
}

/**
 * Collects React's and Radix's "switched between controlled and uncontrolled"
 * warnings. A select that flips on its first pick logs one to every
 * developer's console and resets its internal state along the way.
 */
function watchControlSwitches(): () => string[] {
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");

  return () =>
    [...warn.mock.calls, ...error.mock.calls]
      .map((call) => call.map(String).join(" "))
      .filter((message) =>
        /changing (from )?(an? )?(un)?controlled/i.test(message),
      );
}

describe("date and time, really picked (decision 1.4)", () => {
  const SEPTEMBER = {
    fromDate: new Date(2026, 8, 1),
    toDate: new Date(2026, 8, 30),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("without caller state, shows and sends what was picked", async () => {
    const switches = watchControlSwitches();

    // The shape of the routes form it replaces: name + defaultValue, no
    // state of its own. It used to show nothing and post "".
    const host = await mount(
      createElement(DateTimePickerField, {
        label: "Saída prevista (opcional)",
        htmlfor: "departure",
        name: "planned_departure_at",
        ...SEPTEMBER,
      }),
    );

    const hidden = host.querySelector(
      'input[name="planned_departure_at"]',
    ) as HTMLInputElement;
    const trigger = host.querySelector('[role="combobox"]')!;

    await pickDay(trigger, "17");

    // A day picked first gets the default 08:00, visibly.
    expect(hidden.value).toBe(onLocalClock(8, 0));
    expect(trigger.textContent).toContain("17/09/2026 às 08:00");

    await chooseTime("Hora", "09");

    expect(hidden.value).toBe(onLocalClock(9, 0));
    expect(trigger.textContent).toContain("17/09/2026 às 09:00");

    const clear = Array.from(
      document.querySelectorAll('[role="dialog"] button'),
    ).find((button) => button.textContent === "Limpar")!;

    await click(clear);

    expect(hidden.value).toBe("");
    expect(trigger.textContent).toContain("Selecione data e hora");

    // The hour and minute selects stay controlled from empty to picked and
    // back to empty.
    expect(switches()).toEqual([]);
  });

  it("controlled, hands onChange the ISO with an offset", async () => {
    const switches = watchControlSwitches();
    const seen: string[] = [];

    const Controlled = (): ReactElement => {
      const [value, setValue] = React.useState("");

      return createElement(DateTimePickerField, {
        label: "Retorno previsto (opcional)",
        htmlfor: "return",
        name: "planned_return_at",
        value,
        onChange: (next: string) => {
          seen.push(next);
          setValue(next);
        },
        ...SEPTEMBER,
      });
    };

    const host = await mount(createElement(Controlled));

    await pickDay(host.querySelector('[role="combobox"]')!, "17");
    await chooseTime("Minuto", "30");

    expect(seen).toEqual([onLocalClock(8, 0), onLocalClock(8, 30)]);
    expect(
      (
        host.querySelector(
          'input[name="planned_return_at"]',
        ) as HTMLInputElement
      ).value,
    ).toBe(onLocalClock(8, 30));
    expect(switches()).toEqual([]);
  });

  it.each([
    ["controlled", { value: "2026-09-17T08:30", onChange: () => {} }],
    ["with an initial value", { defaultValue: "2026-09-17T08:30" }],
  ])(
    "%s, does not send a value without an offset that the field cannot show",
    async (_, source) => {
      // A legacy datetime-local string: the field shows it as empty, so it must
      // not post it either — the API would refuse it (decision 1.4).
      const host = await mount(
        createElement(DateTimePickerField, {
          label: "Saída prevista (opcional)",
          htmlfor: "legacy",
          name: "planned_departure_at",
          ...source,
        }),
      );

      expect(
        (
          host.querySelector(
            'input[name="planned_departure_at"]',
          ) as HTMLInputElement
        ).value,
      ).toBe("");
    },
  );
});

/**
 * The ARIA of the date triggers, judged by axe rather than by attribute
 * spotting: an `aria-required` that the role does not allow is present in the
 * DOM and silently ignored by assistive technology, which is exactly what an
 * attribute assertion cannot see.
 */
async function ariaViolations(context: Element): Promise<string[]> {
  const { default: axe } = await import("axe-core");

  const result = await axe.run(context, {
    runOnly: {
      type: "rule",
      values: [
        "aria-allowed-attr",
        "aria-allowed-role",
        "aria-prohibited-attr",
        "aria-required-attr",
        "aria-valid-attr-value",
        "aria-input-field-name",
        "button-name",
      ],
    },
  });

  return result.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.html).join(" | ")}`,
  );
}

describe("the date fields' trigger for a screen reader", () => {
  it("a required DatePickerField with an error has a role that accepts aria-required", async () => {
    const host = await mount(
      createElement(DatePickerField, {
        label: "Data da rota *",
        htmlfor: "scheduled-axe",
        name: "scheduled_date",
        errorName: ["Informe a data da rota."],
      }),
    );

    const trigger = host.querySelector("#scheduled-axe")!;

    expect(trigger.getAttribute("role")).toBe("combobox");
    expect(trigger.getAttribute("aria-required")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");

    expect(await ariaViolations(host)).toEqual([]);
  });

  it("a required DateTimePickerField with an error too", async () => {
    const host = await mount(
      createElement(DateTimePickerField, {
        label: "Saída prevista *",
        htmlfor: "departure-axe",
        name: "planned_departure_at",
        errorName: ["Informe a saída."],
      }),
    );

    const trigger = host.querySelector("#departure-axe")!;

    expect(trigger.getAttribute("role")).toBe("combobox");
    expect(trigger.getAttribute("aria-required")).toBe("true");

    expect(await ariaViolations(host)).toEqual([]);
  });
});

describe("the date field without caller state", () => {
  it("sends the picked day in the FormData", async () => {
    const host = await mount(
      createElement(DatePickerField, {
        label: "Data da rota *",
        htmlfor: "uncontrolled-day",
        name: "scheduled_date",
        dateOnly: true,
      }),
    );

    // The picker opens on the current month and refuses future days, so the
    // 1st is always choosable.
    await pickDay(host.querySelector('[role="combobox"]')!, "1");

    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    expect(
      (host.querySelector('input[name="scheduled_date"]') as HTMLInputElement)
        .value,
    ).toBe(expected);
  });
});

describe("every search combobox", () => {
  it("uses the label as text, since cmdk owns the search's id", async () => {
    const { readdirSync, readFileSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");

    const root = resolve(
      __dirname,
      "../../src/app/(protected)/_components/shared/searches",
    );

    // The one rendered above proves the behaviour; this keeps the other
    // eleven from pointing their label at an id cmdk throws away.
    const offenders = readdirSync(root)
      .map((folder) => join(root, folder, "index.tsx"))
      .filter((file) => existsSync(file))
      .filter((file) => {
        const source = readFileSync(file, "utf8");

        return (
          source.includes("<CommandInput") &&
          source.includes("<FieldShell") &&
          !source.includes("labelTargetsControl={false}")
        );
      });

    expect(offenders).toEqual([]);
  });
});

interface ZoneReading {
  zone: string;
  routeDay: string;
  routeDayPosted: string;
  typedDayPosted: string;
  legacyInstant: string;
  departure: string;
  departureShown: string;
}

/**
 * The date helpers the two fields post and display with, run in real zones.
 * Each zone is a separate Node process (see `inTimeZone`); the worker this
 * file runs in is stuck in the machine's zone.
 */
const DATE_HELPERS = {
  day: resolve(
    __dirname,
    "../../src/app/(protected)/_components/shared/custom/date-picker-field/helpers.ts",
  ),
  moment: resolve(
    __dirname,
    "../../src/app/(protected)/_components/shared/custom/date-time-picker-field/helpers.ts",
  ),
};

const READ_DATES = `
  const pad = (value) => String(value).padStart(2, "0");
  const routeDay = day.parseDateValue("2026-09-17T00:00:00.000Z", true);
  const departure = moment.toIsoFromLocalParts({
    date: new Date(2026, 8, 17),
    hour: 8,
    minute: 30,
  });

  return {
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    routeDay: pad(routeDay.getDate()) + "/" + pad(routeDay.getMonth() + 1),
    routeDayPosted: day.serializeDate(routeDay, true),
    typedDayPosted: day.serializeDate(day.parseDateValue("2026-09-17", true), true),
    legacyInstant: day.serializeDate(day.parseDateValue("2026-09-17", false), false),
    departure,
    departureShown: moment.formatLocalDateTime(moment.localPartsFromIso(departure)),
  };
`;

describe("dates in real time zones (decisions 1.3 and 1.4)", () => {
  // São Paulo and Rio Branco are the east and west ends of the Brazilian
  // mainland (decision 1.1); UTC is CI's zone; Tokyo checks the other side
  // of the date line.
  const ZONES = [
    {
      zone: "America/Sao_Paulo",
      legacyInstant: "2026-09-17T03:00:00.000Z",
      departure: "2026-09-17T11:30:00.000Z",
    },
    {
      zone: "America/Rio_Branco",
      legacyInstant: "2026-09-17T05:00:00.000Z",
      departure: "2026-09-17T13:30:00.000Z",
    },
    {
      zone: "UTC",
      legacyInstant: "2026-09-17T00:00:00.000Z",
      departure: "2026-09-17T08:30:00.000Z",
    },
    {
      zone: "Asia/Tokyo",
      legacyInstant: "2026-09-16T15:00:00.000Z",
      departure: "2026-09-16T23:30:00.000Z",
    },
  ];

  const readings = new Map<string, ZoneReading>();

  beforeAll(async () => {
    await Promise.all(
      ZONES.map(async ({ zone }) => {
        readings.set(
          zone,
          await inTimeZone<ZoneReading>(zone, DATE_HELPERS, READ_DATES),
        );
      }),
    );
  }, 60_000);

  it.each(ZONES)("$zone: the process really runs in that zone", ({ zone }) => {
    // Without this the rest could pass in the machine's zone, which is how
    // the old in-worker TZ assignment fooled this file.
    expect(readings.get(zone)!.zone).toBe(zone);
  });

  it.each(ZONES)(
    "$zone: the route of the 17th opens on the 17th and goes out as 2026-09-17",
    ({ zone }) => {
      const reading = readings.get(zone)!;

      expect(reading.routeDay).toBe("17/09");
      expect(reading.routeDayPosted).toBe("2026-09-17");
      expect(reading.typedDayPosted).toBe("2026-09-17");
    },
  );

  it.each(ZONES)(
    "$zone: without dateOnly, the day goes out as local midnight ($legacyInstant)",
    ({ zone, legacyInstant }) => {
      expect(readings.get(zone)!.legacyInstant).toBe(legacyInstant);
    },
  );

  it.each(ZONES)(
    "$zone: 17/09 at 08:30 on the person's clock goes out as $departure and comes back as 08:30",
    ({ zone, departure }) => {
      const reading = readings.get(zone)!;

      expect(reading.departure).toBe(departure);
      expect(reading.departureShown).toBe("17/09/2026 às 08:30");
    },
  );
});
