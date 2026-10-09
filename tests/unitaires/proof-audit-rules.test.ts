import { describe, expect, it } from "vitest";

import {
  AI_STATE_LABELS,
  AI_STATE_NOTICES,
  aiStateOf,
} from "@/features/deliveries/proof-audits/lib/criteria";
import { rejectionReasonProblem } from "@/features/deliveries/proof-audits/lib/rejection-reason";

/**
 * The rules the proof-audit card applies before talking to the API: the
 * rejection reason (mirrors review-proof-audit/rejection-reason.ts, DLVB-08)
 * and what a card with no reading says (DLVP-PROOF-4).
 */
describe("the rejection reason", () => {
  it("asks for one when it is empty or blank", () => {
    expect(rejectionReasonProblem("")).toMatch(/Diga por que/);
    expect(rejectionReasonProblem("   \n  ")).toMatch(/Diga por que/);
  });

  it("counts the characters after trimming", () => {
    expect(rejectionReasonProblem("   abcd   ")).toMatch(/mínimo 5/);
    expect(rejectionReasonProblem("  abcde  ")).toBeNull();
  });

  it("refuses two blanks inside a line but keeps line breaks", () => {
    expect(rejectionReasonProblem("Foto  ilegível")).toMatch(
      /espaços consecutivos/,
    );
    expect(rejectionReasonProblem("Foto\t ilegível")).toMatch(
      /espaços consecutivos/,
    );
    expect(rejectionReasonProblem("Foto ilegível.\n\nSem data.")).toBeNull();
  });

  it("stops at 500 characters", () => {
    expect(rejectionReasonProblem("a".repeat(500))).toBeNull();
    expect(rejectionReasonProblem("a".repeat(501))).toMatch(/máximo 500/);
  });
});

describe("a card with no reading", () => {
  it("says why, and falls back to the generic sentence for an unknown state", () => {
    expect(aiStateOf({ ai_suggestion: null, aiState: "failed" })).toBe(
      "failed",
    );
    expect(aiStateOf({ ai_suggestion: null, aiState: "quota_exceeded" })).toBe(
      "quota_exceeded",
    );
    expect(aiStateOf({ ai_suggestion: null })).toBe("unavailable");
    expect(aiStateOf({ ai_suggestion: null, aiState: "whatever" })).toBe(
      "unavailable",
    );

    // A suggestion always wins, whatever the field says.
    expect(aiStateOf({ ai_suggestion: {}, aiState: "failed" })).toBe("read");
  });

  it("never says the reading failed when the company did not buy it", () => {
    expect(AI_STATE_LABELS.not_contracted).not.toMatch(/falh/i);
    expect(AI_STATE_NOTICES.not_contracted).toMatch(/não está contratada/);
    expect(AI_STATE_NOTICES.analyzing).toMatch(/em andamento/);
  });
});
