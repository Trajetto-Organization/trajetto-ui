import { describe, expect, it } from "vitest";

import type { TicketEvent } from "@/actions/chat/chat.types";
import {
  TICKETS_QUERY_ROOT,
  TICKETS_SUMMARY_ROOT,
  TICKET_FILTERS,
  assigneeLine,
  closeNoteProblem,
  closedLine,
  ticketEventLine,
  ticketFailureMessage,
  ticketKindLabel,
  ticketOutcomeLabel,
  ticketReadTarget,
  ticketTitle,
} from "@/features/deliveries/chat/lib/ticket-rules";

/**
 * The support tickets' words on the web, pinned where the 06/10 mutation run
 * showed they could change with every test green: the filter chips, the
 * labels, each line of the trail, and the 409 sentences.
 */

const event = (over: Partial<TicketEvent>): TicketEvent =>
  ({
    type: "OPENED",
    actor_kind: "USER",
    actor_name: "Ana",
    actorId: "u-ana",
    target_user_id: null,
    target_user_name: null,
    outcome: null,
    note: null,
    ...over,
  }) as TicketEvent;

describe("filters and labels", () => {
  it("keeps the query roots and the five chips", () => {
    expect(TICKETS_QUERY_ROOT).toBe("chat-tickets");
    expect(TICKETS_SUMMARY_ROOT).toBe("chat-tickets-summary");
    expect(TICKET_FILTERS).toEqual([
      {
        key: "OPEN",
        label: "Abertos",
        query: { status: "OPEN", scope: "ALL" },
        count: "open",
      },
      {
        key: "MINE",
        label: "Meus",
        query: { status: "OPEN", scope: "MINE" },
        count: "mine",
      },
      {
        key: "UNASSIGNED",
        label: "Sem atendente",
        query: { status: "OPEN", scope: "UNASSIGNED" },
        count: "unassigned",
      },
      {
        key: "PENDING_AUTHORIZATION",
        label: "Aguardando autorização",
        query: { status: "OPEN", scope: "PENDING_AUTHORIZATION" },
        count: "pendingAuthorization",
      },
      {
        key: "CLOSED",
        label: "Encerrados",
        query: { status: "CLOSED", scope: "ALL" },
        count: null,
      },
    ]);
  });

  it("names each kind and outcome, and falls back to the raw value", () => {
    expect(
      ["OCCURRENCE", "DELIVERY", "ROUTE", "DRIVER", "LEGACY", "OTHER"].map(
        (kind) => ticketKindLabel(kind as never),
      ),
    ).toEqual([
      "Ocorrência",
      "Entrega",
      "Rota",
      "Geral",
      "Conversa anterior",
      "OTHER",
    ]);
    expect(
      ["RESOLVED", "APPROVED", "DENIED", "MIGRATED", "X"].map((outcome) =>
        ticketOutcomeLabel(outcome as never),
      ),
    ).toEqual([
      "Resolvido",
      "Autorizado: pode seguir",
      "Negado",
      "Histórico migrado",
      "X",
    ]);
    expect(ticketOutcomeLabel(null)).toBe("");
  });

  it("titles a ticket by number and subject", () => {
    expect(ticketTitle({ number: 128, subject: "Cliente ausente" })).toBe(
      "#128 · Cliente ausente",
    );
  });
});

describe("assigneeLine and closedLine", () => {
  it("says a closed ticket without an assignee has none to show", () => {
    expect(assigneeLine({ assignee: null, status: "OPEN" }, "me")).toBe(
      "Sem atendente",
    );
    expect(assigneeLine({ assignee: null, status: "CLOSED" }, "me")).toBe("—");
  });

  it("leaves out each part of the closing line it does not know", () => {
    expect(
      closedLine(
        { closedBy: null, closed_at: null, close_outcome: null },
        () => "x",
      ),
    ).toBe("Atendimento encerrado");
    expect(
      closedLine(
        {
          closedBy: { name: "Ana" } as never,
          closed_at: "2026-10-05T17:02:00Z",
          close_outcome: "APPROVED",
        },
        () => "05/10 às 14:02",
      ),
    ).toBe(
      "Atendimento encerrado por Ana em 05/10 às 14:02 — Autorizado: pode seguir",
    );
  });
});

describe("ticketEventLine", () => {
  it("words each event", () => {
    expect(
      ticketEventLine(event({ type: "OPENED", actor_kind: "SYSTEM" })),
    ).toBe("Atendimento aberto automaticamente");
    expect(ticketEventLine(event({ type: "OPENED" }))).toBe(
      "Ana abriu o atendimento",
    );
    expect(ticketEventLine(event({ type: "OPENED", actor_name: null }))).toBe(
      "Alguém abriu o atendimento",
    );
    expect(
      ticketEventLine(event({ type: "UNASSIGNED", actor_kind: "SYSTEM" })),
    ).toBe("O sistema liberou o atendimento");
    expect(
      ticketEventLine(event({ type: "REOPENED", note: "faltou a nota" })),
    ).toBe("Ana reabriu o atendimento: faltou a nota");
    expect(ticketEventLine(event({ type: "OCCURRENCE_LINKED" }))).toBe(
      "Ocorrência registrada neste atendimento",
    );
    expect(
      ticketEventLine(
        event({
          type: "AUTHORIZATION_DECIDED",
          outcome: "APPROVED",
          note: "ok",
        }),
      ),
    ).toBe("Ana autorizou a ocorrência: ok");
    expect(
      ticketEventLine(
        event({ type: "AUTHORIZATION_DECIDED", outcome: "DENIED" }),
      ),
    ).toBe("Ana negou a ocorrência");
    expect(ticketEventLine(event({ type: "AUTHORIZATION_SUPERSEDED" }))).toBe(
      "O pedido de autorização foi encerrado: a entrega foi resolvida antes da decisão",
    );
    expect(ticketEventLine(event({ type: "SOMETHING_NEW" as never }))).toBe("");
  });

  it("tells taking a ticket apart from handing it over", () => {
    expect(
      ticketEventLine(
        event({
          type: "ASSIGNED",
          actorId: "u-bia",
          target_user_id: "u-bia",
          target_user_name: "Bia",
        }),
      ),
    ).toBe("Bia assumiu o atendimento");
    expect(
      ticketEventLine(
        event({
          type: "ASSIGNED",
          actor_kind: "SYSTEM",
          target_user_id: "u-bia",
          target_user_name: null,
        }),
      ),
    ).toBe("Alguém assumiu o atendimento");
    expect(
      ticketEventLine(
        event({
          type: "ASSIGNED",
          target_user_id: "u-bia",
          target_user_name: null,
        }),
      ),
    ).toBe("Ana passou o atendimento para outra pessoa");
  });
});

describe("closeNoteProblem", () => {
  it("returns the schema's own message for a note that is too long", () => {
    const problem = closeNoteProblem("RESOLVED", "a".repeat(501));

    expect(problem).toContain("A observação");
    expect(problem).not.toBe("Observação inválida.");
  });
});

describe("ticketFailureMessage", () => {
  const fail = (code: string, details: Record<string, unknown>) =>
    ticketFailureMessage({ code, details }, "fallback");

  it("names who closed or holds it, and only a real name", () => {
    expect(
      fail("SUPPORT_TICKET_ALREADY_CLOSED", { closedBy: { name: "Ana" } }),
    ).toBe("Ana já encerrou este atendimento.");
    expect(fail("SUPPORT_TICKET_ALREADY_CLOSED", { closedBy: "Ana" })).toBe(
      "Este atendimento já foi encerrado.",
    );
    expect(
      fail("SUPPORT_TICKET_ALREADY_CLOSED", { closedBy: { name: 5 } }),
    ).toBe("Este atendimento já foi encerrado.");
    expect(fail("SUPPORT_TICKET_ALREADY_CLOSED", { closedBy: null })).toBe(
      "Este atendimento já foi encerrado.",
    );
    // A function has a `name` too; only an object names a person.
    expect(
      fail("SUPPORT_TICKET_ALREADY_CLOSED", { closedBy: function Ana() {} }),
    ).toBe("Este atendimento já foi encerrado.");
    expect(fail("SUPPORT_TICKET_ASSIGNEE_CHANGED", {})).toBe(
      "O atendente mudou. Atualize e tente de novo.",
    );
    expect(
      fail("SUPPORT_TICKET_ASSIGNEE_CHANGED", { assignee: { name: "Bia" } }),
    ).toBe("Bia já assumiu este atendimento.");
  });

  it("says who decided the occurrence, or that the attempt ended", () => {
    expect(fail("OCCURRENCE_ALREADY_DECIDED", {})).toBe(
      "Outra pessoa já negou esta ocorrência.",
    );
    expect(
      fail("OCCURRENCE_ALREADY_DECIDED", {
        decision: { status: "APPROVED", authorizedBy: null },
      }),
    ).toBe("Outra pessoa já autorizou esta ocorrência.");
    expect(
      fail("OCCURRENCE_ALREADY_DECIDED", {
        decision: { status: "DENIED", authorizedBy: { name: "Ana" } },
      }),
    ).toBe("Ana já negou esta ocorrência.");
    expect(
      fail("OCCURRENCE_ALREADY_DECIDED", {
        decision: { status: "SUPERSEDED" },
      }),
    ).toBe("O pedido foi encerrado: a tentativa terminou antes da decisão.");
  });
});

describe("ticketReadTarget", () => {
  it("moves the same ticket's cursor forward, never back", () => {
    const last = { ticketId: "t1", at: "2026-10-06T11:00:00Z" };

    expect(ticketReadTarget(last, "t1", "2026-10-06T12:00:00Z")).toEqual({
      ticketId: "t1",
      at: "2026-10-06T12:00:00Z",
    });
    expect(ticketReadTarget(last, "t1", "2026-10-06T10:00:00Z")).toBeNull();
  });

  it("moves the cursor of another ticket even when its instant is older", () => {
    expect(
      ticketReadTarget(
        { ticketId: "t1", at: "2026-10-06T12:00:00Z" },
        "t2",
        "2026-10-06T11:00:00Z",
      ),
    ).toEqual({
      ticketId: "t2",
      at: "2026-10-06T11:00:00Z",
    });
  });
});
