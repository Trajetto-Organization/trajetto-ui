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
 * The two server actions, as the API answers them. Replaced because they run
 * on the Next server; the panel, its queries and the cache are the real ones.
 * Every call is recorded, since what the panel ASKS for is the point here.
 */
const api = vi.hoisted(() => {
  type Status = "PENDING" | "APPROVED" | "REJECTED";

  const card = (
    id: string,
    status: Status,
    extra: Record<string, unknown> = {},
  ) => ({
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
      recipient_name: `Cliente ${id}`,
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
    ...extra,
  });

  return {
    card,
    queue: [] as ReturnType<typeof card>[],
    failWith: null as null | string,
    listCalls: [] as Array<{
      businessId: string;
      status: Status;
      page: number;
      pageSize: number;
    }>,
    reviewCalls: [] as Array<{
      businessId: string;
      auditId: string;
      verdict: string;
      reason?: string;
    }>,
  };
});

vi.mock("@/actions/delivery/proof-audits", () => ({
  listProofAudits: async (
    businessId: string,
    status: "PENDING" | "APPROVED" | "REJECTED",
    page: number,
    pageSize: number,
  ) => {
    api.listCalls.push({ businessId, status, page, pageSize });

    if (api.failWith) return { success: false, message: api.failWith };

    const mine = api.queue.filter((card) => card.status === status);

    return {
      success: true,
      message: "",
      data: {
        data: mine.slice((page - 1) * pageSize, page * pageSize),
        total: mine.length,
        currentPage: page,
        pageSize,
        meta: {
          pending: api.queue.filter((card) => card.status === "PENDING").length,
          approved: api.queue.filter((card) => card.status === "APPROVED")
            .length,
          rejected: api.queue.filter((card) => card.status === "REJECTED")
            .length,
          agreementRate: 0.75,
          agreementWindowDays: 90,
        },
      },
    };
  },
  reviewProofAudit: async (
    businessId: string,
    auditId: string,
    verdict: string,
    reason?: string,
  ) => {
    api.reviewCalls.push({ businessId, auditId, verdict, reason });

    const found = api.queue.find((card) => card.id === auditId);
    if (found) found.status = verdict as "APPROVED";

    return { success: true, message: "Comprovante revisado." };
  },
}));

import { queryClientProps } from "@/lib/query-client-props";
import { useAuthStore } from "@/store/auth-store";
import { ProofAuditsPanel } from "@/features/deliveries/proof-audits/panel";

/**
 * Auditoria de Comprovantes (Entregas 10): DLVB-02, DLVB-03, DLVB-05,
 * DLVP-PROOF-4 and the rejection's text rules (DLVB-08) on the screen.
 */
const SESSION_BUSINESS = "018f0000-0000-7000-8000-00000000000b";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  api.queue = [api.card("p1", "PENDING")];
  api.failWith = null;
  api.listCalls = [];
  api.reviewCalls = [];

  useAuthStore.getState().setAuth({
    id: "reviewer",
    businessId: SESSION_BUSINESS,
    role: "BUSINESS_ADMIN",
    permissions: [],
    enabledModules: ["DELIVERIES"],
  });
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  queryClientProps.clear();
});

let container: HTMLElement;

async function mountPanel(businessId: string | undefined): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(ProofAuditsPanel, { businessId }),
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

function button(name: RegExp): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (candidate) =>
      name.test(candidate.textContent ?? "") ||
      name.test(candidate.getAttribute("aria-label") ?? ""),
  );

  expect(found, `botão ${name} não encontrado`).toBeDefined();
  return found!;
}

async function click(name: RegExp): Promise<void> {
  await act(async () => button(name).click());
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

describe("the company on /dashboard (DLVB-03)", () => {
  it("lists and approves with the session's company when the page passes none", async () => {
    // /dashboard rendered <ProofAuditsPanel businessId="" />: the listing
    // sent businessId= and the review built /business/.
    await mountPanel("");

    expect(await until(() => text().includes("Cliente p1"))).toBe(true);
    expect(api.listCalls[0].businessId).toBe(SESSION_BUSINESS);

    await click(/^Aprovar$/);

    expect(await until(() => api.reviewCalls.length === 1)).toBe(true);
    expect(api.reviewCalls[0].businessId).toBe(SESSION_BUSINESS);
  });

  it("uses the company picked in /admin when there is one", async () => {
    await mountPanel("018f0000-0000-7000-8000-0000000000cc");

    expect(await until(() => api.listCalls.length > 0)).toBe(true);
    expect(api.listCalls[0].businessId).toBe(
      "018f0000-0000-7000-8000-0000000000cc",
    );
  });

  it("waits for the session instead of asking for a company /dashboard has no selector for", async () => {
    // On the server pass, and before setAuth runs, the store has no company
    // yet: the panel said "escolha a empresa acima" on a page with nothing
    // above to choose from.
    useAuthStore.setState({ businessId: null, role: null, isLoaded: false });

    await mountPanel("");

    expect(text()).not.toContain("Selecione uma empresa");
    expect(text()).not.toContain("escolha a empresa acima");
    expect(
      container.querySelector('[data-testid="proof-audit-queue-loading"]'),
    ).not.toBeNull();
    expect(api.listCalls).toHaveLength(0);

    // loadAuth alone fills the role but not the company: still the session
    // arriving for anyone who is not a master.
    await act(async () => {
      useAuthStore.setState({ role: "BUSINESS_ADMIN", isLoaded: true });
    });

    expect(text()).not.toContain("Selecione uma empresa");
    expect(api.listCalls).toHaveLength(0);

    await act(async () => {
      useAuthStore.setState({ businessId: SESSION_BUSINESS });
    });

    expect(await until(() => text().includes("Cliente p1"))).toBe(true);
    expect(api.listCalls[0].businessId).toBe(SESSION_BUSINESS);
  });

  it("tells a master with no company in the session where the queue is", async () => {
    useAuthStore.setState({ businessId: null, role: "MASTER", isLoaded: true });

    await mountPanel("");

    expect(text()).toContain("Empresa não identificada");
    expect(text()).not.toContain("escolha a empresa acima");
    expect(api.listCalls).toHaveLength(0);
  });

  it("shows a refusal as an error, never as an empty queue", async () => {
    api.failWith = "ID da empresa é inválido.";

    await mountPanel(SESSION_BUSINESS);

    expect(
      await until(() => text().includes("Não foi possível carregar a fila")),
    ).toBe(true);
    expect(text()).toContain("ID da empresa é inválido.");
    expect(text()).not.toContain("Nenhum comprovante esperando revisão");
  });
});

describe("the pages of a tab (DLVB-02)", () => {
  it("pages through the server's pages instead of only ever asking for the first", async () => {
    api.queue = Array.from({ length: 25 }, (_, index) =>
      api.card(`a${String(index).padStart(2, "0")}`, "APPROVED"),
    );

    await mountPanel(SESSION_BUSINESS);

    await click(/^Aprovados/);
    expect(await until(() => text().includes("Cliente a00"))).toBe(true);

    expect(text()).toContain("página 1 de 2");
    expect(text()).not.toContain("Cliente a20");

    await click(/Próxima página/);

    expect(await until(() => text().includes("Cliente a24"))).toBe(true);
    expect(api.listCalls.at(-1)).toMatchObject({ status: "APPROVED", page: 2 });
    expect(text()).not.toContain("Cliente a00");
  });

  it("goes back to page 1 when the chip changes", async () => {
    api.queue = [
      ...Array.from({ length: 25 }, (_, index) =>
        api.card(`a${index}`, "APPROVED"),
      ),
      api.card("r1", "REJECTED"),
    ];

    await mountPanel(SESSION_BUSINESS);

    await click(/^Aprovados/);
    expect(await until(() => text().includes("página 1 de 2"))).toBe(true);
    await click(/Próxima página/);
    expect(await until(() => text().includes("página 2 de 2"))).toBe(true);

    await click(/^Rejeitados/);

    expect(await until(() => text().includes("Cliente r1"))).toBe(true);
    expect(api.listCalls.at(-1)).toMatchObject({ status: "REJECTED", page: 1 });
  });

  it("says over which window the agreement rate was counted", async () => {
    await mountPanel(SESSION_BUSINESS);

    expect(await until(() => text().includes("75%"))).toBe(true);
    expect(text()).toContain("revisados nos últimos 90 dias");
  });
});

describe("a card with no automatic reading (DLVP-PROOF-4)", () => {
  it("says why: still reading, not contracted", async () => {
    api.queue = [
      api.card("wait", "PENDING", { aiState: "analyzing" }),
      api.card("none", "PENDING", { aiState: "not_contracted" }),
    ];

    await mountPanel(SESSION_BUSINESS);

    expect(await until(() => text().includes("Cliente wait"))).toBe(true);

    expect(text()).toContain("Leitura em andamento");
    expect(text()).toContain("Leitura não contratada");
    expect(text()).not.toContain("Sem leitura automática");
  });
});

describe("a reading that did not judge the signature (design P6.2)", () => {
  it("puts the signature under 'Para você conferir', not among the ticks", async () => {
    api.queue = [
      api.card("ocr", "PENDING", {
        ai_suggestion: {
          reading: {
            isReceipt: "yes",
            legible: "yes",
            hasSignature: "unknown",
            dateVisible: "yes",
            documentMatches: "yes",
            photoQuality: 0.9,
            confidence: 0.8,
            observation: "",
            extracted: {
              documentNumber: "45118",
              receiptDateText: null,
              receiptDate: "2026-09-28",
              recipientName: null,
              signatureOnPaper: "unknown",
              digitalSignature: false,
              signatureAssessed: false,
            },
            expected: {
              documentNumber: "45118",
              provenOn: "2026-09-28",
              recipientName: null,
            },
          },
          assessment: {
            suggestion: "needs_review",
            failed: [],
            uncertain: ["hasSignature"],
            reviewPriority: 1,
          },
        },
        aiState: "read",
      }),
    ];

    await mountPanel(SESSION_BUSINESS);

    expect(await until(() => text().includes("Cliente ocr"))).toBe(true);

    const group = document.querySelector('[aria-label="Para você conferir"]');

    expect(group?.textContent).toContain(
      "Conferir na foto — a leitura automática não avalia assinatura.",
    );
  });
});

describe("the rejection reason (DLVB-08)", () => {
  it("refuses consecutive spaces before calling the API, under the field", async () => {
    await mountPanel(SESSION_BUSINESS);
    expect(await until(() => text().includes("Cliente p1"))).toBe(true);

    await click(/^Rejeitar$/);

    const field = container.querySelector("textarea") as HTMLTextAreaElement;

    expect(field.getAttribute("aria-required")).toBe("true");

    await typeInto(field, "Foto  ilegível");
    await click(/^Confirmar rejeição$/);

    expect(
      await until(() =>
        text().includes("não deve conter espaços consecutivos"),
      ),
    ).toBe(true);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(api.reviewCalls).toEqual([]);
  });

  it("sends the trimmed reason, line breaks kept", async () => {
    await mountPanel(SESSION_BUSINESS);
    expect(await until(() => text().includes("Cliente p1"))).toBe(true);

    await click(/^Rejeitar$/);

    await typeInto(
      container.querySelector("textarea") as HTMLTextAreaElement,
      "  Foto ilegível.\nSem data.  ",
    );
    await click(/^Confirmar rejeição$/);

    expect(await until(() => api.reviewCalls.length === 1)).toBe(true);
    expect(api.reviewCalls[0]).toMatchObject({
      verdict: "REJECTED",
      reason: "Foto ilegível.\nSem data.",
    });
  });
});

describe("the photo (DLVB-05)", () => {
  it("turns with R, restores with 0 and with Restaurar", async () => {
    api.queue = [
      api.card("p1", "PENDING", {
        photoUrl: "https://bucket.test/canhoto.jpg",
      }),
    ];

    await mountPanel(SESSION_BUSINESS);
    expect(await until(() => text().includes("Cliente p1"))).toBe(true);

    const stage = container.querySelector(
      '[role="group"][aria-label^="Canhoto"]',
    ) as HTMLElement;

    expect(stage).not.toBeNull();
    expect(stage.tabIndex).toBe(0);

    const press = async (key: string) =>
      act(async () => {
        stage.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
      });

    await press("r");
    expect(stage.dataset.rotation).toBe("90");

    await press("+");
    expect(stage.dataset.zoom).toBe("1.5");

    await press("0");
    expect(stage.dataset.rotation).toBe("0");
    expect(stage.dataset.zoom).toBe("1");

    await press("r");
    expect(button(/Restaurar/).disabled).toBe(false);

    await click(/Restaurar/);
    expect(stage.dataset.rotation).toBe("0");
    expect(button(/Restaurar/).disabled).toBe(true);
  });
});
