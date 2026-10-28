import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * The tower's queue of occurrences waiting for authorization (decision 6.3):
 * its pure rules, and the component on the screen — what each card says, the
 * reason a denial demands, the answer to the operator who lost the race, and
 * the queue getting out of the way when nothing waits.
 */

const api = vi.hoisted(() => ({
  queue: [] as unknown[],
  total: 0,
  decide: vi.fn(),
  canWrite: true,
  listTickets: vi.fn(),
  push: vi.fn(),
  pathname: "/dashboard/control-tower",
  search: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: api.push, refresh: () => {} }),
  usePathname: () => api.pathname,
  useSearchParams: () => new URLSearchParams(api.search),
}));

const toasts = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: toasts }));

// The decision is a server action; the queue itself is read through the
// relay (the stubbed `fetch` below).
vi.mock("@/actions/delivery/occurrence-authorizations", () => ({
  decideOccurrenceAuthorization: (...args: unknown[]) => api.decide(...args),
}));

vi.mock("@/socket", () => ({
  initializeSocket: () => new Promise(() => undefined),
  getSocket: () => null,
  onRealtimeResync: () => () => undefined,
}));

vi.mock("@/hooks/use-operations-subscription", () => ({
  useOperationsSubscription: () => undefined,
}));

vi.mock("@/lib/check-multiple-permissions", () => ({
  useCheckMultiplePermissions: () => ({
    hasAllPermissions: api.canWrite,
    tooltipMessage: "Seu perfil permite apenas a leitura.",
  }),
  getPermissionName: () => "Gerenciar Entregas",
}));

import { stubRelay } from "./helpers/relay-fetch";

import {
  addressLine,
  authorizationBadge,
  decisionCopy,
  decisionNoteProblem,
  queueConversationStep,
  queueTicketHref,
  settledDecisionMessage,
  waitingLabel,
  waitingTone,
} from "@/features/deliveries/occurrence-authorizations/rules";
import { OccurrenceAuthorizationQueue } from "@/features/deliveries/occurrence-authorizations/queue";

const NOW = Date.UTC(2026, 8, 29, 15, 0, 0);

function request(
  id: string,
  minutesAgo: number,
  extra: Record<string, unknown> = {},
) {
  const created = new Date(NOW - minutesAgo * 60_000);

  return {
    id,
    deliveryId: `d-${id}`,
    occurrenceTypeId: "t1",
    occurrenceType: {
      id: "t1",
      name: "Cliente ausente",
      blocks_delivery: true,
    },
    description: null,
    latitude: null,
    longitude: null,
    photos: [],
    form_answers: { quem_atendeu: "Porteiro" },
    form_version: 1,
    answers: [
      { label: "Quem atendeu", value: "Porteiro" },
      { label: "Ligou para o cliente", value: "Sim" },
    ],
    reportedBy: { id: "u1", name: "João Motorista" },
    occurred_at: null,
    created_at: created.toISOString(),
    escalated_at: null,
    escalates_at: new Date(created.getTime() + 10 * 60_000).toISOString(),
    delivery: {
      id: `d-${id}`,
      code: "PED-9",
      invoice_number: null,
      recipient_name: `Mercado ${id}`,
      street: "Rua das Flores",
      address_number: "12",
      neighborhood: "Centro",
      city: "Campinas",
      uf: "SP",
      status: "IN_TRANSIT",
      driver: { id: "dr1", name: "João Motorista" },
    },
    ...extra,
  };
}

describe("the queue's rules", () => {
  it("says how long the driver has waited", () => {
    expect(waitingLabel(new Date(NOW - 20_000).toISOString(), NOW)).toBe(
      "há instantes",
    );
    expect(waitingLabel(new Date(NOW - 4 * 60_000).toISOString(), NOW)).toBe(
      "há 4 min",
    );
    expect(waitingLabel(new Date(NOW - 65 * 60_000).toISOString(), NOW)).toBe(
      "há 1 h 05 min",
    );
    expect(waitingLabel(new Date(NOW - 120 * 60_000).toISOString(), NOW)).toBe(
      "há 2 h",
    );
  });

  it("is late past the escalation instant, and escalated once the admins were told", () => {
    const fresh = request("a", 3);
    const late = request("b", 11);
    const escalated = request("c", 12, {
      escalated_at: new Date(NOW - 60_000).toISOString(),
    });

    expect(waitingTone(fresh, NOW)).toBe("fresh");
    expect(waitingTone(late, NOW)).toBe("late");
    expect(waitingTone(escalated, NOW)).toBe("escalated");
  });

  it("writes the address the way the operator reads it", () => {
    expect(addressLine(request("a", 1).delivery)).toBe(
      "Rua das Flores, 12 — Centro — Campinas/SP",
    );
  });

  it("a denial needs a reason; an approval may go without one", () => {
    expect(decisionNoteProblem("DENIED", "  ")).toBe(
      "Diga ao motorista por que o pedido foi negado.",
    );
    expect(decisionNoteProblem("DENIED", "Deixe  com o porteiro")).toBe(
      "O motivo não deve conter espaços consecutivos.",
    );
    expect(
      decisionNoteProblem("DENIED", "Deixe com o porteiro.\n\nComprove."),
    ).toBeNull();
    expect(decisionNoteProblem("APPROVED", "")).toBeNull();
  });

  it("marks in the feed what the tower still holds or refused", () => {
    expect(authorizationBadge("PENDING")?.label).toBe("Aguardando torre");
    expect(authorizationBadge("DENIED")?.label).toBe("Negada pela torre");
    expect(authorizationBadge("APPROVED")?.label).toBe("Autorizada");
    expect(authorizationBadge("SUPERSEDED")?.label).toBe("Pedido encerrado");
    expect(authorizationBadge("NOT_REQUIRED")).toBeNull();
    expect(authorizationBadge(undefined)).toBeNull();
  });

  it("tells the losing operator who decided what", () => {
    expect(
      settledDecisionMessage(
        {
          status: "APPROVED",
          authorizedBy: { id: "u2", name: "Ana" },
          authorized_at: null,
          note: null,
        },
        "fallback",
      ),
    ).toBe("Ana já autorizou esta ocorrência.");
    expect(
      settledDecisionMessage(
        {
          status: "SUPERSEDED",
          authorizedBy: null,
          authorized_at: null,
          note: null,
        },
        "fallback",
      ),
    ).toBe(
      "O pedido foi encerrado: a tentativa terminou antes da decisão (entrega resolvida, cancelada ou levada para outra rota).",
    );
    expect(settledDecisionMessage(undefined, "fallback")).toBe("fallback");
  });
});

// ------------------------------------------------------------------ screen

let root: Root | null = null;
let host: HTMLDivElement | null = null;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  api.queue = [];
  api.total = 0;
  api.canWrite = true;
  api.decide.mockReset();
  api.listTickets.mockReset();
  api.push.mockReset();
  api.pathname = "/dashboard/control-tower";
  api.search = "";
  toasts.success.mockReset();
  toasts.error.mockReset();
  toasts.info.mockReset();

  // The queue (GET /delivery/occurrence-authorizations) and the ticket
  // lookup of "Ver conversa" (GET /chat/tickets), as the API answers them.
  stubRelay({
    "/delivery/occurrence-authorizations": () => ({
      data: api.queue,
      total: api.total,
      businessId: "b1",
    }),
    "/chat/tickets": (url) =>
      api.listTickets(Object.fromEntries(url.searchParams)),
  });
});

/** A few ticks for the relay answers (fetch, then the body) to land. */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 5; tick += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  document.body.innerHTML = "";
  root = null;
  host = null;
});

async function render(
  props: { onQueueChanged?: () => void } = {},
): Promise<void> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(OccurrenceAuthorizationQueue, {
          businessId: "b1",
          ...props,
        }),
      ),
    );
  });

  // The query resolves on the next ticks.
  await settle();
}

const button = (label: string, scope: ParentNode = document.body) =>
  [...scope.querySelectorAll("button")].find(
    (element) => element.textContent?.trim() === label,
  );

async function click(element: Element | undefined): Promise<void> {
  expect(element).toBeDefined();

  await act(async () => {
    (element as HTMLElement).click();
  });
}

async function typeInto(
  element: HTMLTextAreaElement,
  value: string,
): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )!.set!;

  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("the queue on the screen", () => {
  it("stays out of the way when nothing waits", async () => {
    await render();

    expect(host!.innerHTML).toBe("");
  });

  it("shows each request with the driver's answers, oldest first", async () => {
    api.queue = [request("a", 12), request("b", 2)];
    api.total = 2;

    await render();

    const section = host!.querySelector("section")!;

    expect(section.textContent).toContain("Aguardando autorização da torre");
    expect(section.textContent).toContain("Mercado a");
    expect(section.textContent).toContain("Quem atendeu");
    expect(section.textContent).toContain("Porteiro");
    expect(section.querySelectorAll("li")).toHaveLength(2);
  });

  it("a denial asks for the reason before it is sent", async () => {
    api.queue = [request("a", 3)];
    api.total = 1;
    api.decide.mockResolvedValue({ success: true, message: "Pedido negado." });

    await render();
    await click(button("Negar", host!));

    const dialog = document.querySelector('[role="dialog"]')!;

    expect(dialog.textContent).toContain("Negar ocorrência");

    await click(button("Negar", dialog));

    expect(api.decide).not.toHaveBeenCalled();
    expect(dialog.textContent).toContain(
      "Diga ao motorista por que o pedido foi negado.",
    );

    await typeInto(dialog.querySelector("textarea")!, "Deixe com o porteiro.");
    await click(button("Negar", dialog));

    expect(api.decide).toHaveBeenCalledWith(
      "b1",
      "a",
      "DENIED",
      "Deixe com o porteiro.",
    );
    expect(toasts.success).toHaveBeenCalledWith("Pedido negado.");
  });

  it("the operator who lost the race is told who decided", async () => {
    api.queue = [request("a", 3)];
    api.total = 1;
    api.decide.mockResolvedValue({
      success: false,
      code: "OCCURRENCE_ALREADY_DECIDED",
      message: "Ana já autorizou esta ocorrência.",
      decision: {
        status: "APPROVED",
        authorizedBy: { id: "u2", name: "Ana" },
        authorized_at: null,
        note: null,
      },
    });

    await render();
    await click(button("Autorizar", host!));

    const dialog = document.querySelector('[role="dialog"]')!;

    expect(dialog.textContent).toContain(
      "A entrega passa para Insucesso agora",
    );

    await click(button("Autorizar", dialog));

    expect(api.decide).toHaveBeenCalledWith("b1", "a", "APPROVED", undefined);
    expect(toasts.info).toHaveBeenCalledWith(
      "Ana já autorizou esta ocorrência.",
    );
    expect(toasts.error).not.toHaveBeenCalled();
  });

  it("a read-only profile sees the queue but cannot decide", async () => {
    api.queue = [request("a", 3)];
    api.total = 1;
    api.canWrite = false;

    await render();

    expect((button("Autorizar", host!) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((button("Negar", host!) as HTMLButtonElement).disabled).toBe(true);
  });
});

/**
 * Decision 14.3 (design §7.4): approving a delivery request PROVES the
 * delivery. The tower must see the receipt, the signature and who received,
 * and the buttons must say what they do.
 */
describe("a delivery request in the queue", () => {
  const deliveryRequest = (id: string) =>
    request(id, 4, {
      category: "DELIVERED",
      occurrenceType: {
        id: "t2",
        name: "Entrega com conferência",
        blocks_delivery: false,
      },
      answers: [],
      receipt_photo_url: "https://files.example/canhoto.jpg?sig=1",
      signature_url: "https://files.example/assinatura.png?sig=2",
      received_by: "Porteiro Zé",
    });

  it("words the decision as a delivery", () => {
    const delivered = {
      category: "DELIVERED" as const,
      occurrenceType: { id: "t", name: "x", blocks_delivery: false },
    };

    expect(decisionCopy(delivered, "APPROVED")).toMatchObject({
      title: "Autorizar entrega",
      action: "Autorizar entrega",
    });
    expect(decisionCopy(delivered, "APPROVED").effect).toContain("Entregue");
    expect(decisionCopy(delivered, "DENIED").action).toBe("Negar entrega");

    // A problem keeps today's words; an API without the field reads as one.
    const problem = {
      occurrenceType: { id: "t", name: "x", blocks_delivery: true },
    };

    expect(decisionCopy(problem, "APPROVED")).toMatchObject({
      title: "Autorizar ocorrência",
      action: "Autorizar",
    });
    expect(decisionCopy(problem, "APPROVED").effect).toContain("Insucesso");
  });

  it("shows the receipt, the signature and who received, with delivery buttons", async () => {
    api.queue = [deliveryRequest("e")];
    api.total = 1;
    api.decide.mockResolvedValue({
      success: true,
      message: "Entrega autorizada.",
    });

    await render();

    const card = host!.querySelector("li")!;

    expect(card.textContent).toContain("Quem recebeu: Porteiro Zé");
    expect(
      [...card.querySelectorAll("img")].map((image) =>
        image.getAttribute("src"),
      ),
    ).toEqual([
      "https://files.example/canhoto.jpg?sig=1",
      "https://files.example/assinatura.png?sig=2",
    ]);
    expect(button("Negar", card)).toBeUndefined();

    await click(button("Autorizar entrega", card));

    const dialog = document.querySelector('[role="dialog"]')!;

    expect(dialog.querySelector("h2")?.textContent).toBe("Autorizar entrega");

    await click(button("Autorizar entrega", dialog));

    expect(api.decide).toHaveBeenCalledWith("b1", "e", "APPROVED", undefined);
  });
});

describe("the screen behind the queue (review r1)", () => {
  it("is told when what waits changed, not on the first read", async () => {
    api.queue = [request("a", 3), request("b", 1)];
    api.total = 2;
    api.decide.mockImplementation(async () => {
      // The decision took "a" out of the queue on the server.
      api.queue = [request("b", 1)];
      api.total = 1;

      return { success: true, message: "Ocorrência autorizada." };
    });

    const onQueueChanged = vi.fn();

    await render({ onQueueChanged });

    expect(onQueueChanged).not.toHaveBeenCalled();

    await click(button("Autorizar", host!.querySelector("li")!));
    await click(
      button("Autorizar", document.querySelector('[role="dialog"]')!),
    );

    await settle();

    expect(api.decide).toHaveBeenCalledWith("b1", "a", "APPROVED", undefined);
    expect(onQueueChanged).toHaveBeenCalledTimes(1);
  });
});

describe("Ver conversa on a request (decision 14.5)", () => {
  it("leads to the request's ticket in the Torre's Atendimentos, keeping only the company", () => {
    expect(
      queueTicketHref(
        "/admin/control-tower",
        "businessId=b1&day=2026-10-05",
        "tk1",
      ),
    ).toBe("/admin/control-tower?businessId=b1&view=tickets&ticket=tk1");
    expect(
      queueTicketHref(
        "/dashboard/control-tower",
        "view=occurrences&page=3",
        "tk1",
      ),
    ).toBe("/dashboard/control-tower?view=tickets&ticket=tk1");
  });

  it("opens the ticket, and only says so when there is none", () => {
    expect(queueConversationStep({ id: "tk1" })).toEqual({
      kind: "open",
      ticketId: "tk1",
    });
    expect(queueConversationStep(undefined)).toEqual({
      kind: "none",
      message: "Este pedido ainda não tem atendimento.",
    });
  });

  it("looks the ticket up by the occurrence and goes there", async () => {
    api.queue = [request("a", 3)];
    api.total = 1;
    api.pathname = "/admin/control-tower";
    api.search = "businessId=b1";
    api.listTickets.mockResolvedValue({
      data: [{ id: "tk9" }],
      total: 1,
      counts: {},
    });

    await render();
    await click(button("Ver conversa"));
    await settle();

    expect(api.listTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        occurrenceId: "a",
        businessId: "b1",
        status: "ALL",
      }),
    );
    expect(api.push).toHaveBeenCalledWith(
      "/admin/control-tower?businessId=b1&view=tickets&ticket=tk9",
    );
  });

  it("tells the operator when the request has no ticket, and goes nowhere", async () => {
    api.queue = [request("a", 3)];
    api.total = 1;
    api.listTickets.mockResolvedValue({ data: [], total: 0, counts: {} });

    await render();
    await click(button("Ver conversa"));
    await settle();

    expect(api.push).not.toHaveBeenCalled();
    expect(toasts.info).toHaveBeenCalledWith(
      "Este pedido ainda não tem atendimento.",
    );
  });
});
