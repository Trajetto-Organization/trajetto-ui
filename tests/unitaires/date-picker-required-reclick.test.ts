import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it } from "vitest";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { useDatePicker } from "@/app/(protected)/_components/shared/custom/date-picker-field/hooks";

/**
 * Clicking the day that is already selected.
 *
 * The calendar (react-day-picker, single mode) reports a click on the
 * selected day as `undefined`, "unselect". The checklist form opens with
 * today filled in; a person who clicked today to confirm it emptied a
 * required field, the trigger went back to "Selecione uma data", and the
 * form refused to submit with nothing visibly wrong. Found by
 * tests/ui/journey-fleet.spec.ts driving the checklist form.
 *
 * A required field keeps its day; an optional one ("Data de conclusão
 * (opcional)") can still be cleared that way.
 */
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

type Picker = ReturnType<typeof useDatePicker>;

async function mountHook(
  props: Parameters<typeof useDatePicker>[0],
): Promise<() => Picker> {
  let latest: Picker | null = null;

  const Probe = (): null => {
    latest = useDatePicker(props);

    return null;
  };

  const host = document.createElement("div");

  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(createElement(Probe)));

  return () => latest!;
}

const DAY = "2026-10-06";

describe("clicking the already picked day again", () => {
  it("on a required field keeps the day (before: it emptied the field)", async () => {
    const sent: string[] = [];
    const picker = await mountHook({
      value: DAY,
      dateOnly: true,
      required: true,
      onChange: (v) => sent.push(v),
    });

    expect(picker().formatted).toBe("06/10/2026");

    await act(async () => picker().handleSelect(undefined));

    expect(sent).toEqual([]);
    expect(picker().formatted).toBe("06/10/2026");
  });

  it("on an optional field still clears it, which is how the date is undone", async () => {
    const sent: string[] = [];
    const picker = await mountHook({
      value: DAY,
      dateOnly: true,
      onChange: (v) => sent.push(v),
    });

    await act(async () => picker().handleSelect(undefined));

    expect(sent).toEqual([""]);
    expect(picker().formatted).toBe("");
  });

  it("the field reads 'Data *' as required: clicking the picked day, on the real calendar, does not erase it", async () => {
    // Rendered for real: DatePickerField must hand the label's rule to the
    // hook, or every form that marks the field with "*" alone (most of them)
    // keeps the defect.
    const sent: string[] = [];
    const host = document.createElement("div");

    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () =>
      root!.render(
        createElement(DatePickerField, {
          label: "Data do Checklist *",
          htmlfor: "checklist_date",
          name: "checklist_date",
          value: DAY,
          dateOnly: true,
          allowFutureDates: true,
          onChange: (value: string) => sent.push(value),
        }),
      ),
    );

    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!;

    expect(trigger.textContent).toContain("06/10/2026");

    await act(async () => trigger.click());

    const selected = [
      ...document.querySelectorAll<HTMLButtonElement>('button[name="day"]'),
    ].find((day) => day.getAttribute("aria-selected") === "true");

    expect(
      selected?.textContent,
      "o calendário não marcou o dia do campo",
    ).toBe("6");

    await act(async () => selected!.click());

    expect(sent).toEqual([]);
    expect(trigger.textContent).toContain("06/10/2026");
  });
});
