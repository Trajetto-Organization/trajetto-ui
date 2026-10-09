import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { OccurrenceFormBuilder } from "@/features/deliveries/occurrence-types/form-builder";
import {
  definitionFromDrafts,
  emptyDraft,
  type DraftField,
} from "@/features/deliveries/occurrence-types/form-builder/builder-rules";
import {
  panelReportAuthorizationNotice,
  panelReportForm,
  queriesStaleAfterReport,
} from "@/features/deliveries/deliveries/detail-dialog/occurrence-report-rules";
import type { OccurrenceFormField } from "@/features/deliveries/occurrence-types/form-builder/rules";

/**
 * The builder's refusals on the screen (decision 3.4): each lands on the
 * input it is about — red, aria-invalid, described by its message — and the
 * card keeps only what no input owns. And the panel report's copy for a type
 * that asks the tower (decision 6.3).
 */

let root: Root | null = null;
let host: HTMLDivElement | null = null;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = null;
  host = null;
});

function draft(patch: Partial<DraftField>): DraftField {
  return { ...emptyDraft(patch.type), ...patch };
}

async function renderBuilder(drafts: DraftField[]): Promise<void> {
  const verdict = definitionFromDrafts(drafts);

  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(OccurrenceFormBuilder, {
        value: drafts,
        onChange: () => undefined,
        fieldErrors: verdict.fieldErrors,
        formError: verdict.formError,
      }),
    );
  });
}

describe("the builder's refusals on the screen", () => {
  it("mark the input at fault, and only it", async () => {
    const drafts = [
      draft({ uid: "q1", key: "ok", label: "Certo", type: "text" }),
      draft({
        uid: "q2",
        key: "ok",
        label: "Repetida",
        type: "number",
        min: "5",
        max: "1",
      }),
    ];

    await renderBuilder(drafts);

    const key = host!.querySelector<HTMLInputElement>("#q2-key")!;
    const min = host!.querySelector<HTMLInputElement>("#q2-min")!;
    const label = host!.querySelector<HTMLInputElement>("#q2-label")!;

    expect(key.getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(
        key.getAttribute("aria-describedby")!.split(" ")[0],
      )?.textContent,
    ).toBe('A chave "ok" aparece em mais de um campo.');

    expect(min.getAttribute("aria-invalid")).toBe("true");
    expect(host!.textContent).toContain(
      '"Repetida": o mínimo não pode ser maior que o máximo.',
    );

    // The neighbour is fine, and so is the first question.
    expect(label.hasAttribute("aria-invalid")).toBe(false);
    expect(host!.querySelector("#q1-key")!.hasAttribute("aria-invalid")).toBe(
      false,
    );

    // Red is the input at fault, not only its attributes (decision 3.4).
    expect(key.classList.contains("border-red-600")).toBe(true);
    expect(min.classList.contains("border-red-600")).toBe(true);
    expect(label.classList.contains("border-red-600")).toBe(false);
    expect(
      host!.querySelector("#q1-key")!.classList.contains("border-red-600"),
    ).toBe(false);

    // The builder's own card/form text follows every keystroke, so it is not
    // an alert; the only alerts are the inputs' own messages (FieldShell),
    // announced once when the input turns invalid.
    const alerts = [...host!.querySelectorAll('[role="alert"]')].map(
      (node) => node.id,
    );

    expect(alerts.sort()).toEqual(["q2-key-error", "q2-min-error"]);
  });

  it("a list with a single option turns its options box red", async () => {
    await renderBuilder([
      draft({
        uid: "q1",
        key: "motivo",
        label: "Motivo",
        type: "select",
        optionsText: "Ausente",
      }),
    ]);

    const options = host!.querySelector<HTMLTextAreaElement>("#q1-options")!;

    expect(options.getAttribute("aria-invalid")).toBe("true");
    expect(options.classList.contains("border-red-600")).toBe(true);
    expect(
      host!.querySelector("#q1-label")!.classList.contains("border-red-600"),
    ).toBe(false);
  });

  it("a number typed as words is refused in Portuguese, on its input", async () => {
    await renderBuilder([
      draft({
        uid: "q1",
        key: "volumes",
        label: "Volumes",
        type: "number",
        max: "dez",
      }),
    ]);

    const max = host!.querySelector<HTMLInputElement>("#q1-max")!;

    expect(max.getAttribute("aria-invalid")).toBe("true");
    expect(host!.textContent).toContain("O máximo deve ser um número.");
    expect(host!.textContent).not.toContain("Expected number");
  });
});

describe("the panel's report of a type that asks the tower", () => {
  it("says who authorizes it, by what the author may do in the queue", () => {
    expect(panelReportAuthorizationNotice(true)).toContain(
      "vale como autorizado por você",
    );
    expect(panelReportAuthorizationNotice(false)).toContain(
      "vai para a fila de autorização",
    );
    expect(panelReportAuthorizationNotice(false)).not.toContain(
      "autorizado por você",
    );
  });

  it("always sends the form_version it showed; answers only with questions", () => {
    // A type with no questions yet: the version still goes, so a form added
    // meanwhile is answered 409 with the new form, not 400 about fields the
    // dialog never showed.
    expect(
      panelReportForm({ formVersion: 1, fields: null, answers: null }),
    ).toEqual({
      form_version: 1,
    });

    const fields: OccurrenceFormField[] = [
      {
        key: "quem",
        label: "Quem atendeu",
        type: "text",
        required: true,
        max_length: 60,
        multiline: false,
      },
    ];

    expect(
      panelReportForm({
        formVersion: 3,
        fields,
        answers: { quem: "Porteiro" },
      }),
    ).toEqual({
      form_answers: { quem: "Porteiro" },
      form_version: 3,
    });

    // Optional questions left blank: an empty answer set, still versioned.
    expect(panelReportForm({ formVersion: 2, fields, answers: null })).toEqual({
      form_answers: {},
      form_version: 2,
    });

    // A type the selector did not describe: nothing invented.
    expect(
      panelReportForm({ formVersion: undefined, fields: null, answers: null }),
    ).toEqual({});
  });

  it("reads the types again after a 409 OCCURRENCE_FORM_OUTDATED, and only then", () => {
    expect(queriesStaleAfterReport("OCCURRENCE_FORM_OUTDATED", "b1")).toEqual([
      ["occurrence-types-select", "b1"],
    ]);
    expect(queriesStaleAfterReport("OCCURRENCE_FORM_INVALID", "b1")).toEqual(
      [],
    );
    expect(queriesStaleAfterReport(undefined, "b1")).toEqual([]);
  });
});
