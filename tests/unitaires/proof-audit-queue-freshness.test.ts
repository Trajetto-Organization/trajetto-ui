import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/deliveries",
  useSearchParams: () => new URLSearchParams("tab=proof-audits"),
}));

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

/**
 * The API: a queue per status that the review moves a card across. The
 * listing is a relay GET (the stubbed `fetch` answers it) and the review a
 * server action, which runs on the Next server; the panel, its queries and
 * the cache are the real ones.
 */
const api = vi.hoisted(() => {
  type Status = "PENDING" | "APPROVED" | "REJECTED";

  const card = (id: string, status: Status, recipient: string) => ({
    id,
    deliveryId: `d-${id}`,
    status,
    ai_suggestion: null,
    ai_confidence: null,
    ai_analyzed_at: null,
    reviewedById: null,
    reviewerName: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: "2026-09-28T10:00:00.000Z",
    delivery: {
      id: `d-${id}`,
      recipient_name: recipient,
      city: "Uberlândia",
      uf: "MG",
      invoice_number: null,
      code: null,
      delivered_at: "2026-09-28T10:00:00.000Z",
      received_by: null,
      driverName: null,
    },
    photoUrl: null,
    signatureUrl: null,
  });

  const state = {
    queues: {} as Record<Status, ReturnType<typeof card>[]>,
    hold: null as null | Status,
    released: [] as Array<() => void>,
    card,
  };

  return state;
});

vi.mock("@/actions/delivery/proof-audits", () => ({
  reviewProofAudit: async (
    _businessId: string,
    auditId: string,
    verdict: "APPROVED" | "REJECTED",
  ) => {
    const reviewed = api.queues.PENDING.find((card) => card.id === auditId)!;

    api.queues.PENDING = api.queues.PENDING.filter(
      (card) => card.id !== auditId,
    );
    api.queues[verdict] = [
      { ...reviewed, status: verdict },
      ...api.queues[verdict],
    ];

    return { success: true, message: "Comprovante revisado." };
  },
}));

import { ndjson, stubRelay } from "./helpers/relay-fetch";

import { queryClientProps } from "@/lib/query-client-props";
import { useAuthStore } from "@/store/auth-store";
import { ProofAuditsPanel } from "@/features/deliveries/proof-audits/panel";

/**
 * Auditoria de Comprovantes (Entregas 10; REV-5, REV-13, DLVB-01).
 *
 * Approving a receipt updated the counters and nothing else: the "Aprovados"
 * list stayed as it was for five minutes, Atualizar included, until F5. And
 * the first visit to a status showed the PENDING cards — with their Approve
 * buttons — under the other chip while it loaded.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  api.queues = {
    PENDING: [api.card("p1", "PENDING", "Mercado Central")],
    APPROVED: [api.card("a0", "APPROVED", "Padaria Antiga")],
    REJECTED: [],
  };
  api.hold = null;
  api.released = [];

  // GET /delivery/proof-audits, NDJSON like the API; a held status waits.
  stubRelay({
    "/delivery/proof-audits": async (url) => {
      const status = url.searchParams.get("status") as
        "PENDING" | "APPROVED" | "REJECTED";

      if (api.hold === status) {
        await new Promise<void>((release) => api.released.push(release));
      }

      return ndjson(
        {
          total: api.queues[status].length,
          page: 1,
          pageSize: 20,
          searchMeta: {
            pending: api.queues.PENDING.length,
            approved: api.queues.APPROVED.length,
            rejected: api.queues.REJECTED.length,
            agreementRate: null,
          },
        },
        [...api.queues[status]],
      );
    },
  });

  useAuthStore.getState().setAuth({
    id: "reviewer",
    businessId: BUSINESS,
    role: "BUSINESS_ADMIN",
    permissions: [],
    enabledModules: ["DELIVERIES"],
  });
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  api.released.forEach((release) => release());
  while (unmounts.length) await unmounts.pop()!();
  queryClientProps.clear();
});

let container: HTMLElement;

async function mountPanel(): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(ProofAuditsPanel, { businessId: BUSINESS }),
      ),
    );
  });

  unmounts.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
}

async function until(condition: () => boolean, ms = 2_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

const text = () => container.textContent ?? "";

function buttonNamed(name: RegExp): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find((candidate) =>
    name.test(candidate.textContent ?? ""),
  );

  expect(button, `botão ${name} não encontrado`).toBeDefined();
  return button!;
}

async function click(name: RegExp): Promise<void> {
  await act(async () => buttonNamed(name).click());
}

describe("a receipt approved in the queue", () => {
  it("is in the Aprovados list when that chip is opened", async () => {
    await mountPanel();
    expect(await until(() => text().includes("Mercado Central"))).toBe(true);

    // The reviewer had looked at the approved ones a minute before.
    await click(/^Aprovados/);
    expect(await until(() => text().includes("Padaria Antiga"))).toBe(true);
    await click(/^Na fila/);
    expect(await until(() => text().includes("Mercado Central"))).toBe(true);

    await click(/^Aprovar$/);
    expect(await until(() => !text().includes("Mercado Central"))).toBe(true);

    await click(/^Aprovados/);

    expect(
      await until(() => text().includes("Mercado Central")),
      "o comprovante aprovado não apareceu em Aprovados",
    ).toBe(true);
  });
});

describe("the first visit to another status", () => {
  it("does not show the queue's cards, with their buttons, while it loads", async () => {
    await mountPanel();
    expect(await until(() => text().includes("Mercado Central"))).toBe(true);

    api.hold = "REJECTED";
    await click(/^Rejeitados/);
    await until(() => api.released.length > 0, 500);

    expect(text(), "cartões da fila sob o chip Rejeitados").not.toContain(
      "Mercado Central",
    );
    expect(
      [...container.querySelectorAll("button")].some((button) =>
        /^Aprovar$/.test(button.textContent ?? ""),
      ),
      "botão Aprovar sob o chip Rejeitados",
    ).toBe(false);
  });
});
