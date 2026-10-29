import { describe, expect, it } from "vitest";

import {
  answersFromInputs,
  definitionFromDrafts,
  draftsFromDefinition,
  emptyDraft,
  keyFromLabel,
  labelledAnswers,
  type DraftField,
} from "@/features/deliveries/occurrence-types/form-builder/builder-rules";
import { validateOccurrenceAnswers } from "@/features/deliveries/occurrence-types/form-builder/rules";

/**
 * The form builder of the occurrence type dialog (decision 6.2): what the
 * company types becomes the definition the API stores, with the same
 * refusals, and a stored form comes back into the builder unchanged.
 */
function draft(patch: Partial<DraftField>): DraftField {
  return { ...emptyDraft(patch.type), ...patch };
}

describe("the key of a question", () => {
  it("comes from the label: no accents, underscores, a letter first", () => {
    expect(keyFromLabel("Quem atendeu?")).toBe("quem_atendeu");
    expect(keyFromLabel("Número do protocolo / SAC")).toBe(
      "numero_do_protocolo_sac",
    );
    expect(keyFromLabel("2ª tentativa")).toBe("campo_2a_tentativa");
    expect(keyFromLabel("   ")).toBe("campo");
  });

  it("never repeats a key already taken in the form", () => {
    expect(keyFromLabel("Motivo", new Set(["motivo"]))).toBe("motivo_2");
    expect(keyFromLabel("Motivo", new Set(["motivo", "motivo_2"]))).toBe(
      "motivo_3",
    );
  });

  it("stays within 40 characters", () => {
    expect(keyFromLabel("a".repeat(60))).toHaveLength(40);
    expect(
      keyFromLabel("a".repeat(60), new Set(["a".repeat(40)])),
    ).toHaveLength(40);
  });
});

describe("the drafts as a definition", () => {
  it("builds the normalized definition the API stores", () => {
    const verdict = definitionFromDrafts([
      draft({
        key: "quem",
        label: "Quem atendeu",
        type: "text",
        required: true,
        maxLength: "80",
      }),
      draft({
        key: "motivo",
        label: "Motivo",
        type: "select",
        optionsText: "Recusa\n\n Ausente \n",
      }),
      draft({
        key: "volumes",
        label: "Volumes",
        type: "number",
        min: "1",
        max: "10,5",
      }),
    ]);

    expect(verdict.valid).toBe(true);
    expect(verdict.fields).toEqual([
      {
        key: "quem",
        label: "Quem atendeu",
        type: "text",
        required: true,
        max_length: 80,
        multiline: false,
      },
      {
        key: "motivo",
        label: "Motivo",
        type: "select",
        required: false,
        options: ["Recusa", "Ausente"],
      },
      {
        key: "volumes",
        label: "Volumes",
        type: "number",
        required: false,
        min: 1,
        max: 10.5,
        integer: false,
      },
    ]);
  });

  it("an empty builder is no form", () => {
    expect(definitionFromDrafts([])).toEqual({
      fields: null,
      fieldErrors: {},
      formError: null,
      valid: true,
    });
  });

  it("points each refusal at its question and at the input that holds it", () => {
    const verdict = definitionFromDrafts([
      draft({ key: "ok", label: "Certo", type: "text" }),
      draft({
        key: "lista",
        label: "Lista",
        type: "select",
        optionsText: "Só uma",
      }),
      draft({
        key: "faixa",
        label: "Faixa",
        type: "number",
        min: "5",
        max: "1",
      }),
      draft({ key: "texto", label: "Texto", type: "number", min: "dez" }),
      draft({
        key: "Chave Ruim",
        label: "  ",
        type: "text",
        maxLength: "muito",
      }),
    ]);

    expect(verdict.valid).toBe(false);
    expect(verdict.fieldErrors).toEqual({
      1: {
        inputs: { options: "A lista precisa de pelo menos 2 opções." },
        card: null,
      },
      2: {
        inputs: { min: '"Faixa": o mínimo não pode ser maior que o máximo.' },
        card: null,
      },
      // The builder's own words, not zod's "Expected number, received nan".
      3: { inputs: { min: "O mínimo deve ser um número." }, card: null },
      4: {
        inputs: {
          max_length: "O limite de caracteres deve ser um número.",
          key: expect.stringContaining("A chave do campo deve começar"),
          label: "O rótulo do campo não pode conter apenas espaços.",
        },
        card: null,
      },
    });
    expect(verdict.fieldErrors[0]).toBeUndefined();
  });

  it("says which question repeats a key, on its Chave input", () => {
    const verdict = definitionFromDrafts([
      draft({ key: "ok", label: "Certo", type: "text" }),
      draft({ key: "ok", label: "Repetida", type: "boolean" }),
    ]);

    expect(verdict.fieldErrors).toEqual({
      1: {
        inputs: { key: 'A chave "ok" aparece em mais de um campo.' },
        card: null,
      },
    });
  });

  it("round-trips a stored form through the builder", () => {
    const stored = [
      {
        key: "quem",
        label: "Quem atendeu",
        type: "text",
        required: true,
        max_length: 80,
        multiline: true,
        help: "Nome",
      },
      { key: "ligou", label: "Ligou", type: "boolean", required: false },
      {
        key: "motivo",
        label: "Motivo",
        type: "select",
        required: true,
        options: ["A", "B"],
      },
      {
        key: "volumes",
        label: "Volumes",
        type: "number",
        required: false,
        min: 1,
        integer: true,
      },
      { key: "dia", label: "Dia", type: "date", required: false },
    ];

    const again = definitionFromDrafts(draftsFromDefinition(stored));

    expect(again.fields).toEqual(stored);
  });
});

describe("the panel's answers", () => {
  const fields = definitionFromDrafts([
    draft({ key: "ligou", label: "Ligou", type: "boolean", required: true }),
    draft({
      key: "volumes",
      label: "Volumes",
      type: "number",
      required: true,
      integer: true,
    }),
    draft({ key: "obs", label: "Observação", type: "text" }),
  ]).fields;

  it("types the inputs as the API takes them", () => {
    expect(
      answersFromInputs(fields, { ligou: "false", volumes: "3", obs: "" }),
    ).toEqual({
      ligou: false,
      volumes: 3,
    });
  });

  it("keeps a number that does not parse, so the check refuses it", () => {
    const answers = answersFromInputs(fields, {
      ligou: "true",
      volumes: "três",
    });

    expect(validateOccurrenceAnswers(fields, answers).errors).toEqual({
      volumes: '"Volumes" deve ser um número.',
    });
  });
});

describe("the answers as the history shows them", () => {
  it("labels them in the form's order, keeping a removed question's key", () => {
    const stored = [
      { key: "b", label: "Segunda", type: "boolean", required: false },
      { key: "a", label: "Primeira", type: "date", required: false },
    ];

    expect(
      labelledAnswers(stored, { a: "2026-10-01", b: true, removida: "x" }),
    ).toEqual([
      { key: "b", label: "Segunda", value: "Sim" },
      { key: "a", label: "Primeira", value: "01/10/2026" },
      { key: "removida", label: "removida", value: "x" },
    ]);
  });

  it("no answers read as nothing", () => {
    expect(labelledAnswers(null, null)).toEqual([]);
    expect(labelledAnswers([], ["x"])).toEqual([]);
  });
});
