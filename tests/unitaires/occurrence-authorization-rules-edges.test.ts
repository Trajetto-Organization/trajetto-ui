import { describe, expect, it } from "vitest";

import {
  AUTHORIZATION_QUEUE_ROOT,
  addressLine,
  authorizationBadge,
  decisionCopy,
  decisionNoteProblem,
  queueTicketHref,
  settledDecisionMessage,
  waitingLabel,
  waitingTone,
} from "@/features/deliveries/occurrence-authorizations/rules";

/**
 * Edges of the tower's authorization queue on the web left alive by the 06/10
 * mutation run: the exact minute boundaries, the escalation instant itself,
 * an address without a neighbourhood, and the words of each decision.
 */

const T0 = Date.parse("2026-10-06T10:00:00.000Z");
const at = (minutes: number) => T0 + minutes * 60_000;

describe("waitingLabel", () => {
  it("counts the first minute and the first hour from their exact boundary", () => {
    const created = new Date(T0).toISOString();

    expect(waitingLabel(created, at(1))).toBe("há 1 min");
    expect(waitingLabel(created, at(59))).toBe("há 59 min");
    expect(waitingLabel(created, at(60))).toBe("há 1 h");
  });
});

describe("waitingTone", () => {
  it("is late from the escalation instant itself", () => {
    const row = {
      escalated_at: null,
      escalates_at: new Date(T0).toISOString(),
    };

    expect(waitingTone(row, T0)).toBe("late");
    expect(waitingTone(row, T0 - 1)).toBe("fresh");
  });
});

describe("addressLine", () => {
  it("skips a missing neighbourhood", () => {
    expect(
      addressLine({
        street: "Rua A",
        address_number: null,
        neighborhood: null,
        city: "Campinas",
        uf: "SP",
      } as never),
    ).toBe("Rua A — Campinas/SP");
  });
});

describe("decisionNoteProblem", () => {
  it("returns the schema's own message for a reason that is too long", () => {
    const problem = decisionNoteProblem("DENIED", "a".repeat(501));

    expect(problem).toContain("O motivo");
    expect(problem).not.toBe("Motivo inválido.");
  });
});

describe("decisionCopy", () => {
  const occurrence = (blocks: boolean) =>
    ({
      category: "STANDARD",
      occurrenceType: { blocks_delivery: blocks },
    }) as never;

  it("words each decision", () => {
    expect(
      decisionCopy(
        {
          category: "DELIVERED",
          occurrenceType: { blocks_delivery: false },
        } as never,
        "DENIED",
      ),
    ).toEqual({
      title: "Negar entrega",
      action: "Negar entrega",
      effect:
        "A entrega continua em rota. O motorista recebe o motivo no aplicativo, na hora.",
    });
    expect(decisionCopy(occurrence(true), "DENIED")).toEqual({
      title: "Negar ocorrência",
      action: "Negar",
      effect:
        "Nada muda na entrega. O motorista recebe o motivo no aplicativo, na hora.",
    });
    expect(decisionCopy(occurrence(false), "APPROVED").effect).toBe(
      "O motorista recebe a autorização no aplicativo e segue com a entrega.",
    );
  });
});

describe("settledDecisionMessage", () => {
  it("says who decided, or someone else", () => {
    expect(
      settledDecisionMessage(
        { status: "DENIED", authorizedBy: null } as never,
        "x",
      ),
    ).toBe("Outra pessoa já negou esta ocorrência.");
    expect(
      settledDecisionMessage(
        { status: "DENIED", authorizedBy: { name: "Ana" } } as never,
        "x",
      ),
    ).toBe("Ana já negou esta ocorrência.");
  });
});

describe("authorizationBadge", () => {
  it("colours each status", () => {
    expect(
      ["PENDING", "APPROVED", "DENIED", "SUPERSEDED"].map(
        (status) => authorizationBadge(status)?.className,
      ),
    ).toEqual([
      "border-amber-200 bg-amber-100 text-amber-900",
      "border-green-200 bg-green-100 text-green-800",
      "border-red-200 bg-background text-red-800",
      "border-slate-200 bg-slate-100 text-slate-700",
    ]);
  });
});

describe("AUTHORIZATION_QUEUE_ROOT", () => {
  it("is the query root the queue is invalidated by", () => {
    expect(AUTHORIZATION_QUEUE_ROOT).toBe("occurrence-authorizations");
  });
});

describe("queueTicketHref", () => {
  it("opens in the company area when the path is unknown", () => {
    expect(queueTicketHref(null, "", "t1")).toMatch(
      /^\/dashboard\/deliveries\?/,
    );
  });
});
