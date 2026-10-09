import { describe, expect, it } from "vitest";

import {
  VERDICT_LABELS,
  SIGNATURE_TO_CHECK,
  answeredCriteria,
  comparisonRows,
  criteriaToCheck,
  dayLabel,
} from "@/features/deliveries/proof-audits/lib/criteria";

/**
 * The receipt's reading on the review card (decision 6.9): "é um canhoto?"
 * first, and what was read next to what was expected — the model transcribes,
 * the code compares.
 */
const reading = {
  isReceipt: "yes" as const,
  legible: "yes" as const,
  hasSignature: "yes" as const,
  dateVisible: "no" as const,
  documentMatches: "not_applicable" as const,
  photoQuality: 0.9,
  confidence: 0.9,
  observation: "ok",
  extracted: {
    documentNumber: "45118",
    receiptDateText: "25/09/2026",
    receiptDate: "2026-09-25",
    recipientName: "Maria Souza",
    signatureOnPaper: "no" as const,
    digitalSignature: true,
  },
  expected: {
    documentNumber: null,
    provenOn: "2026-09-27",
    recipientName: "Mercado Central",
  },
};

describe("the reading on a card", () => {
  it("leads with 'is it a receipt' and names 'nothing to compare'", () => {
    const rows = answeredCriteria(reading);

    expect(rows[0]).toMatchObject({ key: "isReceipt", verdict: "yes" });
    expect(rows.find((row) => row.key === "documentMatches")?.verdict).toBe(
      "not_applicable",
    );
    expect(VERDICT_LABELS.not_applicable).toBe("Sem número para conferir");
  });

  it("shows only what a reading from before answered", () => {
    const {
      isReceipt: _absent,
      extracted: _e,
      expected: _x,
      ...legacy
    } = reading;

    expect(answeredCriteria(legacy).map((row) => row.key)).toEqual([
      "legible",
      "hasSignature",
      "documentMatches",
      "dateVisible",
    ]);
    expect(comparisonRows(legacy)).toEqual([]);
  });

  it("puts what was read next to what was expected", () => {
    expect(comparisonRows(reading)).toEqual([
      { label: "Número da NF-e", read: "45118", expected: null },
      {
        label: "Data de recebimento",
        read: "25/09/2026",
        expected: "27/09/2026",
      },
      { label: "Recebedor", read: "Maria Souza", expected: "Mercado Central" },
      { label: "Assinatura", read: "Coletada na tela do app", expected: null },
    ]);
  });

  it("formats a day without a clock", () => {
    expect(dayLabel("2026-09-27")).toBe("27/09/2026");
    expect(dayLabel("27/09")).toBeNull();
  });
});

describe("a reader that does not see signatures (ADR 0010, design P6.2)", () => {
  const ocr = {
    ...reading,
    hasSignature: "unknown" as const,
    extracted: {
      ...reading.extracted,
      digitalSignature: false,
      signatureOnPaper: "unknown" as const,
      signatureAssessed: false,
    },
  };

  it("moves the signature out of the ticks into 'para você conferir'", () => {
    expect(answeredCriteria(ocr).map((row) => row.key)).not.toContain(
      "hasSignature",
    );
    expect(criteriaToCheck(ocr)).toEqual([
      {
        key: "hasSignature",
        label: "Tem assinatura",
        note: SIGNATURE_TO_CHECK,
      },
    ]);
    expect(SIGNATURE_TO_CHECK).toBe(
      "Conferir na foto — a leitura automática não avalia assinatura.",
    );
  });

  it("says what to do in the signature row instead of 'não deu para ver'", () => {
    expect(
      comparisonRows(ocr).find((row) => row.label === "Assinatura")?.read,
    ).toBe("Conferir na foto");
  });

  it("leaves a reading that judged the signature as it was", () => {
    expect(criteriaToCheck(reading)).toEqual([]);
    expect(answeredCriteria(reading).map((row) => row.key)).toContain(
      "hasSignature",
    );
  });
});
