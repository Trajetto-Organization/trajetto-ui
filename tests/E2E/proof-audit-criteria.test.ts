import { test, expect } from "@playwright/test";

import {
  CRITERIA,
  NO_SUGGESTION_NOTICE,
  SUGGESTION_LABELS,
  SUGGESTION_TONES,
  VERDICT_LABELS,
  VERDICT_TONES,
  asPercent,
} from "../../src/features/deliveries/proof-audits/lib/criteria";

/**
 * How a machine's reading of a receipt is put in front of a person.
 *
 * The whole queue exists because an AI verdict with nobody behind it does not
 * close a probative cycle. So the way the reading is PRESENTED matters as much
 * as the reading: a card that reads like a verdict produces reviewers who
 * agree with it, which is the same as not having a queue.
 */
test.describe("the criteria on a card", () => {
  test("mirrors the API's four, in the order they should be read", () => {
    // Most damning first. A reviewer scanning down the list should hit the
    // thing that invalidates the rest before the details.
    expect(CRITERIA.map((criterion) => criterion.key)).toEqual([
      "legible",
      "hasSignature",
      "documentMatches",
      "dateVisible",
    ]);
  });

  test("says what a failure MEANS, not only that it failed", () => {
    // "Signature present: no" is a fact. "A slip with no signature does not
    // prove receipt" is what lets somebody decide.
    for (const criterion of CRITERIA) {
      expect(criterion.label.length, criterion.key).toBeGreaterThan(5);
      expect(criterion.meaning.length, criterion.key).toBeGreaterThan(20);
    }
  });
});

test.describe("the three answers", () => {
  test("keeps 'não sei' distinct from 'não'", () => {
    // The single most important distinction on this screen. Collapsing them
    // would have people rejecting receipts the model merely could not read —
    // and a rejection sends a driver back to an address.
    expect(VERDICT_LABELS.unknown).not.toBe(VERDICT_LABELS.no);

    expect(VERDICT_LABELS.unknown).toContain("Não deu");
    expect(VERDICT_LABELS.no).toBe("Não");
  });

  test("does not paint 'não sei' as a failure", () => {
    // Red on an unanswered criterion reads as a finding. It is not one.
    expect(VERDICT_TONES.unknown).not.toContain("red");
    expect(VERDICT_TONES.no).toContain("red");
  });
});

test.describe("the suggestion badge", () => {
  test("never says approved or rejected", () => {
    // The machine suggests; a person decides. A badge reading "Aprovado" would
    // make the buttons below it feel like a formality.
    const words = Object.values(SUGGESTION_LABELS).join(" ").toLowerCase();

    expect(words).not.toContain("aprovad");
    expect(words).not.toContain("rejeitad");

    expect(SUGGESTION_LABELS.looks_good).toContain("Parece");
  });

  test("has a tone for each of the three readings", () => {
    for (const key of [
      "looks_good",
      "needs_review",
      "looks_wrong",
    ] as const) {
      expect(SUGGESTION_TONES[key], key).toContain("border-");
    }
  });
});

test.describe("a card with no reading at all", () => {
  test("invites a decision rather than reporting an error", () => {
    // No AI is an ordinary state: the company may not have bought it, the
    // quota may be spent, the provider may be down. The photo is still there
    // and a person can still decide — which is the entire point of the queue
    // existing independently of the model.
    expect(NO_SUGGESTION_NOTICE).toContain("Avalie a foto");

    expect(NO_SUGGESTION_NOTICE.toLowerCase()).not.toContain("erro");
    expect(NO_SUGGESTION_NOTICE.toLowerCase()).not.toContain("falha");
  });
});

test.describe("percentages", () => {
  test("rounds to whole points", () => {
    expect(asPercent(0.874)).toBe("87%");
    expect(asPercent(1)).toBe("100%");
  });

  test("keeps 'nothing reviewed yet' distinct from zero", () => {
    // Null and 0% are different facts, and a 0% would read as "the machine is
    // always wrong".
    expect(asPercent(null)).toBeNull();
    expect(asPercent(0)).toBe("0%");
  });
});
