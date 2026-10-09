import { describe, expect, it } from "vitest";

import type { TicketEvent } from "@/actions/chat/chat.types";

import {
  TICKET_FILTERS,
  assigneeLine,
  closeNoteProblem,
  closedLine,
  occurrenceConversationStep,
  openTicketBlockedReason,
  ticketBadge,
  ticketReadTarget,
  ticketEventLine,
  ticketFailureMessage,
  ticketFilterQuery,
} from "@/features/deliveries/chat/lib/ticket-rules";
import {
  filterAboutText,
  filterQueryOf,
  filterSubjectText,
  messageMatchesFilter,
  ticketIdOf,
} from "@/features/deliveries/chat/lib/history-filter";
import {
  buildChatSearchParams,
  buildTicketSearchParams,
  readChatLink,
  readTicketLink,
  withoutChatLink,
} from "@/features/deliveries/chat/lib/chat-link";
import {
  newTicketProblems,
  newTicketTarget,
} from "@/features/deliveries/chat/lib/ticket-form";

/** The web's pure rules of the support tickets (decision 14.5). */
describe("the ticket list's filters", () => {
  it("maps each chip to the API's status and scope", () => {
    expect(TICKET_FILTERS.map((option) => option.label)).toEqual([
      "Abertos",
      "Meus",
      "Sem atendente",
      "Aguardando autorização",
      "Encerrados",
    ]);
    expect(ticketFilterQuery("MINE")).toEqual({
      status: "OPEN",
      scope: "MINE",
    });
    expect(ticketFilterQuery("PENDING_AUTHORIZATION")).toEqual({
      status: "OPEN",
      scope: "PENDING_AUTHORIZATION",
    });
    expect(ticketFilterQuery("CLOSED")).toEqual({
      status: "CLOSED",
      scope: "ALL",
    });
  });

  it("names who handles a ticket", () => {
    expect(assigneeLine({ assignee: null, status: "OPEN" }, "me")).toBe(
      "Sem atendente",
    );
    expect(
      assigneeLine(
        { assignee: { id: "me", name: "Ana" }, status: "OPEN" },
        "me",
      ),
    ).toBe("Com você");
    expect(
      assigneeLine(
        { assignee: { id: "x", name: "Otto" }, status: "OPEN" },
        "me",
      ),
    ).toBe("Com Otto");
  });

  it("badges the tab with unread open tickets, urgent while a request waits", () => {
    expect(
      ticketBadge({
        open: 3,
        unassigned: 1,
        mine: 0,
        pendingAuthorization: 1,
        unreadOpen: 2,
      }),
    ).toEqual({
      count: 2,
      urgent: true,
    });
    expect(ticketBadge(null)).toEqual({ count: 0, urgent: false });
  });
});

describe("the trail and the close", () => {
  const event = (overrides: Partial<TicketEvent>): TicketEvent => ({
    id: "e1",
    ticketId: "t1",
    type: "OPENED",
    actor_kind: "USER",
    actorId: "u1",
    actor_name: "Ana",
    target_user_id: null,
    target_user_name: null,
    outcome: null,
    note: null,
    created_at: "2026-10-05T10:00:00.000Z",
    ...overrides,
  });

  it("says who did what", () => {
    expect(
      ticketEventLine(
        event({ type: "OPENED", actor_kind: "SYSTEM", actor_name: null }),
      ),
    ).toBe("Atendimento aberto automaticamente");
    expect(
      ticketEventLine(
        event({
          type: "ASSIGNED",
          actor_kind: "SYSTEM",
          target_user_id: "u2",
          target_user_name: "Otto",
        }),
      ),
    ).toBe("Otto assumiu o atendimento");
    expect(
      ticketEventLine(
        event({
          type: "ASSIGNED",
          target_user_id: "u2",
          target_user_name: "Otto",
        }),
      ),
    ).toBe("Ana passou o atendimento para Otto");
    expect(
      ticketEventLine(
        event({ type: "CLOSED", outcome: "APPROVED", note: "ok" }),
      ),
    ).toBe("Ana encerrou — Autorizado: pode seguir: ok");
    expect(
      ticketEventLine(
        event({ type: "AUTHORIZATION_DECIDED", outcome: "DENIED" }),
      ),
    ).toBe("Ana negou a ocorrência");
  });

  it("asks for a reason to deny, and nothing else", () => {
    expect(closeNoteProblem("DENIED", "  ")).toBe(
      "Diga ao motorista por que o pedido foi negado.",
    );
    expect(closeNoteProblem("DENIED", "Volte amanhã")).toBeNull();
    expect(closeNoteProblem("RESOLVED", "")).toBeNull();
    expect(closeNoteProblem("APPROVED", "x".repeat(501))).toMatch(
      /no máximo 500/,
    );
  });

  it("tells a lost race who won, by the API's code", () => {
    expect(
      ticketFailureMessage(
        {
          code: "SUPPORT_TICKET_ALREADY_CLOSED",
          details: { closedBy: { id: "u", name: "Otto" } },
        },
        "fallback",
      ),
    ).toBe("Otto já encerrou este atendimento.");
    expect(
      ticketFailureMessage(
        {
          code: "SUPPORT_TICKET_ASSIGNEE_CHANGED",
          details: { assignee: { id: "u", name: "Bia" } },
        },
        "fallback",
      ),
    ).toBe("Bia já assumiu este atendimento.");
    expect(
      ticketFailureMessage(
        {
          code: "OCCURRENCE_ALREADY_DECIDED",
          details: {
            decision: { status: "DENIED", authorizedBy: { name: "Rui" } },
          },
        },
        "fallback",
      ),
    ).toBe("Rui já negou esta ocorrência.");
    expect(
      ticketFailureMessage({ code: "OTHER", details: {} }, "A frase da API"),
    ).toBe("A frase da API");
    expect(ticketFailureMessage(undefined, "A frase da API")).toBe(
      "A frase da API",
    );
  });

  it("writes the closed banner with who, when and how", () => {
    expect(
      closedLine(
        {
          closedBy: { id: "u", name: "Ana" },
          closed_at: "2026-10-05T14:02:00Z",
          close_outcome: "RESOLVED",
        },
        () => "05/10 às 14:02",
      ),
    ).toBe("Atendimento encerrado por Ana em 05/10 às 14:02 — Resolvido");
  });
});

describe("Ver conversa on an occurrence", () => {
  it("opens the ticket, and never creates one: it points a writer to Abrir atendimento", () => {
    expect(occurrenceConversationStep({ id: "t1" }, false)).toEqual({
      kind: "open",
      ticketId: "t1",
    });

    // Viewing must not ring the other operators nor give the driver a subject.
    const writer = occurrenceConversationStep(null, true);
    expect(writer.kind).toBe("none");
    expect(writer.kind === "none" && writer.message).toContain(
      "Abrir atendimento",
    );

    expect(occurrenceConversationStep(undefined, false)).toEqual({
      kind: "none",
      message:
        "Esta ocorrência não tem atendimento, e seu perfil permite apenas a leitura.",
    });
  });

  it("disables Abrir atendimento with the reason for the vendor's seat and a read-only profile", () => {
    expect(openTicketBlockedReason("BUSINESS_ADMIN", true)).toBeNull();
    expect(openTicketBlockedReason("MASTER", true)).toMatch(/apenas acompanha/);
    expect(openTicketBlockedReason("BUSINESS_USER", false)).toMatch(
      /apenas a leitura/,
    );
  });
});

describe("the ticket's read cursor", () => {
  it("claims only a rendered message, never the clock, and never repeats an instant", () => {
    // Nothing rendered (an empty ticket, a page still loading): nothing sent.
    expect(ticketReadTarget(null, "tk1", null)).toBeNull();

    expect(ticketReadTarget(null, "tk1", "2026-10-05T10:00:00.000Z")).toEqual({
      ticketId: "tk1",
      at: "2026-10-05T10:00:00.000Z",
    });

    const last = { ticketId: "tk1", at: "2026-10-05T10:00:00.000Z" };
    expect(
      ticketReadTarget(last, "tk1", "2026-10-05T10:00:00.000Z"),
    ).toBeNull();
    expect(
      ticketReadTarget(last, "tk1", "2026-10-05T09:00:00.000Z"),
    ).toBeNull();
    expect(ticketReadTarget(last, "tk2", "2026-10-05T09:00:00.000Z")).toEqual({
      ticketId: "tk2",
      at: "2026-10-05T09:00:00.000Z",
    });
  });
});

describe("a conversation narrowed to a ticket", () => {
  const ticket = { kind: "ticket" as const, id: "tk1", label: "#128" };

  it("asks for the ticket, keeps the other tickets out and writes into it", () => {
    expect(filterQueryOf(ticket)).toEqual({ ticketId: "tk1" });
    expect(filterQueryOf(null)).toEqual({});
    expect(
      messageMatchesFilter(ticket, { deliveryId: null, ticketId: "tk1" }),
    ).toBe(true);
    expect(
      messageMatchesFilter(ticket, { deliveryId: null, ticketId: "tk2" }),
    ).toBe(false);
    // A message from an API older than the tickets has no ticket: not this one.
    expect(messageMatchesFilter(ticket, { deliveryId: null })).toBe(false);
    expect(ticketIdOf(ticket)).toBe("tk1");
    expect(ticketIdOf({ kind: "route", id: "r1", label: "Rota 1" })).toBeNull();
    expect(filterSubjectText(ticket)).toBe("do atendimento #128");
    expect(filterAboutText(ticket)).toBe("o atendimento #128");
  });

  it("keeps the delivery and route filters as they were", () => {
    expect(
      filterQueryOf({ kind: "delivery", id: "e1", label: "Padaria" }),
    ).toEqual({ deliveryId: "e1" });
    expect(
      messageMatchesFilter(
        { kind: "route", id: "r1", label: "Rota 1" },
        { deliveryId: null, routeId: "r1" },
      ),
    ).toBe(true);
    expect(
      filterSubjectText({ kind: "delivery", id: "e1", label: "Padaria" }),
    ).toBe("da entrega de Padaria");
  });
});

describe("links to a ticket", () => {
  it("builds and reads ?ticket=, dropping a previous link, keeping the company", () => {
    const params = buildTicketSearchParams(
      "businessId=b1&tab=occurrences&page=2&chatDriver=d1",
      "tk1",
    );

    expect(params.get("tab")).toBe("chat");
    expect(params.get("businessId")).toBe("b1");
    expect(params.get("page")).toBeNull();
    expect(params.get("chatDriver")).toBeNull();
    expect(readTicketLink(params)).toBe("tk1");
    expect(readChatLink(params)).toBeNull();
    expect([...withoutChatLink(params).keys()].sort()).toEqual([
      "businessId",
      "tab",
    ]);
  });

  it("lets the driver link carry the ticket too", () => {
    const params = buildChatSearchParams("", {
      driver: { id: "d1", name: "João" },
      ticket: { id: "tk9" },
    });

    expect(readTicketLink(params)).toBe("tk9");
    expect(readTicketLink(new URLSearchParams("ticket=%20"))).toBeNull();
  });
});

describe("the Novo atendimento form", () => {
  it("asks for a subject of 3 to 160 characters", () => {
    expect(newTicketProblems({ subject: "", message: "" }).subject).toBe(
      "Informe o assunto do atendimento.",
    );
    expect(newTicketProblems({ subject: "ab", message: "" }).subject).toMatch(
      /ao menos 3/,
    );
    expect(
      newTicketProblems({ subject: "x".repeat(161), message: "" }).subject,
    ).toMatch(/no máximo 160/);
    expect(
      newTicketProblems({ subject: "Documentos", message: "x".repeat(2001) }),
    ).toEqual({
      subject: null,
      message: "A mensagem deve ter no máximo 2000 caracteres.",
      context: null,
    });
  });

  it("asks for the delivery or the route instead of a subject when the ticket is about one (design §6.1)", () => {
    const delivery = { subject: "", message: "", about: "DELIVERY" as const };

    expect(newTicketProblems(delivery)).toEqual({
      subject: null,
      message: null,
      context: "Escolha a entrega do atendimento.",
    });
    expect(
      newTicketProblems({ ...delivery, deliveryId: "d-1" }).context,
    ).toBeNull();
    expect(
      newTicketProblems({ subject: "", message: "", about: "ROUTE" }).context,
    ).toBe("Escolha a rota do atendimento.");
  });

  it("sends the delivery or the route, never a subject, for a ticket about one", () => {
    expect(
      newTicketTarget({
        subject: "  ignorado ",
        message: "",
        about: "DELIVERY",
        deliveryId: "d-1",
      }),
    ).toEqual({ deliveryId: "d-1" });
    expect(
      newTicketTarget({
        subject: "",
        message: "",
        about: "ROUTE",
        routeId: "r-1",
      }),
    ).toEqual({
      routeId: "r-1",
    });
    // A stale id of the other kind never leaks into a general ticket.
    expect(
      newTicketTarget({
        subject: " Documentos ",
        message: "",
        about: "GENERAL",
        deliveryId: "d-1",
      }),
    ).toEqual({ subject: "Documentos" });
  });
});
