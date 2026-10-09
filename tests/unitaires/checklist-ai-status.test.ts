import { describe, expect, it } from "vitest";

import { checklistAIStatusBadge } from "@/features/vehicle-checklist/lib/ai-status";

/**
 * The "Verificação IA" badge of a checklist (ADR 0010 §5): the OCR reader
 * reads the km and cannot judge a photo of a screen, so an overall
 * "verified" with such a field is "Km confere" in a neutral badge, never the
 * green "Verificado IA" seal. The API contract does not change.
 */
const FIELD_WITHOUT_FRAUD_CHECK = {
  current_mileage: {
    status: "verified",
    fraudAssessed: false,
    observation: "Km lida confere com a informada.",
  },
};

describe("checklistAIStatusBadge", () => {
  it("keeps the seal for a reading that assessed fraud", () => {
    const badge = checklistAIStatusBadge(
      {
        ai_verification_status: "verified",
        ai_verification_details: { current_mileage: { status: "verified" } },
      },
      undefined,
    );

    expect(badge.label).toBe("Verificado IA");
    expect(badge.className).toMatch(/green/);
  });

  it("says 'Km confere', neutral, when a stored field was read without a fraud check", () => {
    const badge = checklistAIStatusBadge(
      {
        ai_verification_status: "verified",
        ai_verification_details: FIELD_WITHOUT_FRAUD_CHECK,
      },
      undefined,
    );

    expect(badge.label).toBe("Km confere");
    expect(badge.className).not.toMatch(/green/);
  });

  it("reads details stored as a string by older rows", () => {
    const badge = checklistAIStatusBadge(
      {
        ai_verification_status: "verified",
        ai_verification_details: JSON.stringify(FIELD_WITHOUT_FRAUD_CHECK),
      },
      undefined,
    );

    expect(badge.label).toBe("Km confere");
  });

  it("follows the live analysis, and its fraudAssessed flag when it finishes", () => {
    const record = {
      ai_verification_status: "pending",
      ai_verification_details: null,
    };

    expect(
      checklistAIStatusBadge(record, { step: "reading_field" }).label,
    ).toBe("Analisando...");
    expect(
      checklistAIStatusBadge(record, {
        step: "completed",
        overallStatus: "verified",
        currentResult: {
          fraudAssessed: false,
          details: "Km lida confere com a informada.",
        },
      }),
    ).toMatchObject({
      label: "Km confere",
      title: "Km lida confere com a informada.",
    });
    expect(
      checklistAIStatusBadge(record, {
        step: "completed",
        overallStatus: "verified",
        currentResult: {},
      }).label,
    ).toBe("Verificado IA");
  });

  it("leaves the other verdicts alone", () => {
    expect(
      checklistAIStatusBadge(
        {
          ai_verification_status: "issues_found",
          ai_verification_details: FIELD_WITHOUT_FRAUD_CHECK,
        },
        undefined,
      ).label,
    ).toBe("Problemas Encontrados");
    expect(
      checklistAIStatusBadge({ ai_verification_status: null }, undefined).label,
    ).toBe("Não Analisado");
  });
});
