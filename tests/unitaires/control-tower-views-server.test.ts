import { createElement, type ReactNode } from "react";
import { renderHtml } from "./helpers/render-html";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Torre's server page and its views (product meeting of 14/10/2026).
 *
 * Monitoramento, Ocorrências, Atendimentos and Auditoria moved here from
 * Entregas. What their tabs did on the server must still happen: the
 * occurrences are a server-side table with its sort and facets, the board's
 * cards come from the summary, the tickets' module is probed, a refusal is
 * said as what it is, and each view keeps the permission its tab had. The
 * real server component runs with the API answered by a stub; the client
 * views are placeholders.
 */
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

vi.mock("@/app/(protected)/_components/shared/business-selector", () => ({
  BusinessSelector: () => null,
}));

vi.mock("@/app/(protected)/_components/layout/protected-page-toolbar", () => ({
  ProtectedPageToolbar: ({
    actions,
    children,
  }: {
    actions?: ReactNode;
    children: ReactNode;
  }) => createElement("header", null, actions, children),
}));

vi.mock("@/features/control-tower/shell", () => ({
  ControlTowerShell: ({
    view,
    header,
    children,
  }: {
    view: string;
    header: ReactNode;
    children: ReactNode;
  }) => createElement("main", { "data-view": view }, header, children),
}));

vi.mock("@/features/control-tower/views/tabs", () => ({
  ControlTowerViewTabs: ({ allowedViews }: { allowedViews?: string[] }) =>
    createElement("nav", { "data-views": (allowedViews ?? []).join(",") }),
}));

vi.mock("@/features/control-tower/page-actions", () => ({
  ControlTowerPageActions: () =>
    createElement("div", { "data-actions": "tower" }),
}));

// The Painel, the authorization queue and Ocorrências' action bar load as
// their own chunks (views/lazy-views.tsx); what is checked here is what the
// page hands them.
vi.mock("@/features/control-tower/views/lazy-views", () => ({
  ControlTowerContent: () => createElement("section", { "data-panel": "map" }),
  DeliveriesPageActions: ({ activeTab }: { activeTab: string }) =>
    createElement("div", { "data-actions": activeTab }),
  OccurrenceAuthorizationQueue: ({ businessId }: { businessId?: string }) =>
    createElement("aside", {
      "data-authorization-queue": "",
      "data-queue-business": businessId ?? "",
    }),
}));

vi.mock("@/features/deliveries/table", () => ({
  DeliveriesTable: ({ activeTab }: { activeTab: string }) =>
    createElement("table", { "data-table": activeTab }),
}));

vi.mock("@/features/deliveries/stats", () => ({
  DeliveriesStats: ({ activeTab }: { activeTab: string }) =>
    createElement("div", { "data-stats": activeTab }),
}));

vi.mock("@/features/deliveries/realtime", () => ({
  DeliveriesRealtime: () => null,
}));

vi.mock("@/features/deliveries/content/lazy-panels", () => ({
  MonitoringPanel: () =>
    createElement("section", { "data-panel": "monitoring" }),
  ChatPanel: () => createElement("section", { "data-panel": "chat" }),
  ProofAuditsPanel: ({ businessId }: { businessId?: string }) =>
    createElement("section", {
      "data-panel": "proof-audits",
      "data-business": businessId ?? "",
    }),
  MessageTemplatesPanel: () => null,
}));

vi.mock("@/lib/parse-nd-json", () => ({
  parseNDJSON: async () => ({
    meta: { total: 0, page: 1, pageSize: 10 },
    data: [],
  }),
}));

vi.mock(
  "@/components/shared/custom/access-error-state/manage-modules-button",
  () => ({
    ManageModulesButton: ({ businessId }: { businessId: string }) =>
      createElement("button", { "data-manage": businessId }, "Gerenciar"),
  }),
);

vi.mock("@/components/shared/custom/select-business-empty-state", () => ({
  SelectBusinessEmptyState: () =>
    createElement("div", { "data-select-business": "" }),
}));

import { ControlTowerViews } from "@/features/control-tower/views";

const COMPANY = "018f0000-0000-7000-8000-00000000c0de";

type Answer = { status: number; body: unknown };

let answers: Array<[RegExp, Answer]> = [];
const requested: string[] = [];

const adminMe: Answer = {
  status: 200,
  body: {
    user: {
      role: "BUSINESS_ADMIN",
      businessId: COMPANY,
      driverId: null,
      enabledModules: ["DELIVERIES"],
    },
  },
};

const readOnlyMe: Answer = {
  status: 200,
  body: {
    user: {
      role: "BUSINESS_USER",
      businessId: COMPANY,
      driverId: null,
      enabledModules: ["DELIVERIES"],
      profileAccess: {
        permissions: [
          { permissionKey: "delivery_manage", canRead: true, canWrite: false },
        ],
      },
    },
  },
};

const masterMe: Answer = {
  status: 200,
  body: { user: { role: "MASTER", driverId: null, enabledModules: [] } },
};

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  requested.length = 0;

  vi.stubGlobal("fetch", async (input: string) => {
    const url = String(input);
    requested.push(url);

    const match = answers.find(([pattern]) => pattern.test(url));
    const { status, body } = match?.[1] ?? { status: 500, body: {} };

    return new Response(JSON.stringify(body), { status });
  });
});

afterEach(() => {
  answers = [];
  vi.unstubAllGlobals();
});

async function render(
  mode: "admin" | "dashboard",
  searchParams: Record<string, string>,
): Promise<string> {
  const element = await ControlTowerViews({
    mode,
    searchParams,
    token: "token",
    tiles: null,
  });

  return renderHtml(element);
}

const summary: Answer = {
  status: 200,
  body: {
    data: {
      totals: {
        unassigned: 1,
        designated: 2,
        inRoute: 3,
        deliveredToday: 4,
        failedToday: 0,
        occurrencesToday: 1,
      },
      drivers: [],
    },
  },
};

describe("the default view", () => {
  it("is the board by route, with the day's numbers from the server", async () => {
    answers = [
      [/\/user\/me$/, adminMe],
      [/operation-summary/, summary],
    ];

    const html = await render("dashboard", {});

    expect(html).toContain('data-view="routes"');
    expect(html).toContain('data-panel="monitoring"');
    expect(html).toContain('data-stats="monitoring"');
    expect(html).toContain('data-actions="tower"');
  });

  it("shows what waits for the tower, where the driver's notice lands", async () => {
    // The authorization notices link to the bare Torre: no view, so the
    // board by route — the request must be on it, above the numbers.
    answers = [
      [/\/user\/me$/, adminMe],
      [/operation-summary/, summary],
    ];

    const html = await render("dashboard", {});

    expect(html).toContain("data-authorization-queue");
    // On /dashboard the queue reads the session's company.
    expect(html).toContain('data-queue-business=""');
    expect(html.indexOf("data-authorization-queue")).toBeLessThan(
      html.indexOf('data-stats="monitoring"'),
    );
  });

  it("keeps the board live when the summary fails", async () => {
    answers = [
      [/\/user\/me$/, adminMe],
      [/operation-summary/, { status: 500, body: {} }],
    ];

    const html = await render("dashboard", {});

    expect(html).toContain('data-panel="monitoring"');
    expect(html).toContain("Números do dia indisponíveis");
  });

  it("says a refused summary as what it is", async () => {
    answers = [
      [/\/user\/me$/, { status: 503, body: {} }],
      [
        /operation-summary/,
        { status: 403, body: { code: "PERMISSION_DENIED" } },
      ],
    ];

    const html = await render("dashboard", { view: "routes" });

    expect(html).toContain("Sem permissão para esta seção");
    expect(html).not.toContain("não contratado");
  });
});

describe("the occurrences, moved from Entregas", () => {
  it("send the feed's sort and facets, with the export in the header", async () => {
    answers = [
      [/\/user\/me$/, adminMe],
      [/list-occurrences/, { status: 200, body: "" }],
    ];

    const html = await render("dashboard", {
      view: "occurrences",
      sort: "typeName",
      order: "asc",
      severity: "blocking",
    });

    const url = requested.find((candidate) =>
      candidate.includes("/delivery/list-occurrences"),
    );

    expect(url, requested.join(" ")).toBeDefined();

    const query = new URL(url!).searchParams;

    expect(query.get("sort")).toBe("typeName");
    expect(query.get("severity")).toBe("blocking");

    expect(html).toContain('data-table="occurrences"');
    expect(html).toContain('data-actions="occurrences"');
  });

  it("stay behind occurrence_manage: a read-only profile opens the board", async () => {
    answers = [
      [/\/user\/me$/, readOnlyMe],
      [/operation-summary/, summary],
    ];

    const html = await render("dashboard", { view: "occurrences" });

    expect(html).toContain('data-view="routes"');
    expect(html).not.toMatch(/data-views="[^"]*occurrences/);
    expect(requested.some((url) => url.includes("list-occurrences"))).toBe(
      false,
    );
  });
});

describe("the tickets, moved from Entregas", () => {
  it("probe the module and say a switched-off company", async () => {
    answers = [
      [/\/user\/me$/, { status: 503, body: {} }],
      [/list-threads/, { status: 403, body: { code: "TENANT_INACTIVE" } }],
    ];

    const html = await render("dashboard", { view: "tickets" });

    expect(html).toContain("Empresa desativada");
    expect(html).not.toContain('data-panel="chat"');
  });

  it("open the panel when the module answers", async () => {
    answers = [
      [/\/user\/me$/, adminMe],
      [/list-threads/, { status: 200, body: { data: [] } }],
    ];

    const html = await render("dashboard", { view: "tickets" });

    expect(html).toContain('data-panel="chat"');
  });
});

describe("the proof audit, moved from Entregas", () => {
  it("acts on the session's company on /dashboard (DLVB-03)", async () => {
    answers = [[/\/user\/me$/, adminMe]];

    const html = await render("dashboard", { view: "audit" });

    expect(html).toContain('data-panel="proof-audits"');
    expect(html).toContain(`data-business="${COMPANY}"`);
    // The last view this browser chose may be this one when a notice opens
    // the bare Torre: the waiting request shows here too.
    expect(html).toContain("data-authorization-queue");
  });
});

/**
 * One header for every view (decision of 28/10/2026): Auditoria opted out
 * of the Torre's Atualizar and drew its own beside its counters — the same
 * refresh of the whole tab, one line lower than on every other view, and
 * the loading skeleton's header button jumped there when the queue arrived.
 */
describe("the header of every view", () => {
  const header = (html: string) =>
    /<header>([\s\S]*?)<nav /.exec(html)?.[1] ?? "";

  it.each([
    ["routes", [[/operation-summary/, summary]]],
    ["panel", []],
    ["tickets", [[/list-threads/, { status: 200, body: { data: [] } }]]],
    ["audit", []],
  ] as Array<[string, Array<[RegExp, Answer]>]>)(
    "%s carries the Torre's Atualizar, above the views strip",
    async (view, extra) => {
      answers = [[/\/user\/me$/, adminMe], ...extra];

      const html = await render("dashboard", { view });

      expect(html).toContain(`data-view="${view}"`);
      expect(header(html)).toContain('data-actions="tower"');
    },
  );
});

describe("the MASTER on /admin/control-tower", () => {
  it("asks for a company first, and fetches nothing else", async () => {
    answers = [[/\/user\/me$/, masterMe]];

    const html = await render("admin", { view: "occurrences" });

    expect(html).toContain("data-select-business");
    expect(requested.filter((url) => !url.endsWith("/user/me"))).toEqual([]);
  });

  it("sees the module state for a company without Entregas, on any view", async () => {
    answers = [
      [/\/user\/me$/, masterMe],
      [
        /\/delivery\/message-templates\?businessId=/,
        { status: 403, body: { code: "MODULE_NOT_ENABLED" } },
      ],
    ];

    const html = await render("admin", {
      view: "tickets",
      businessId: COMPANY,
    });

    expect(html).toContain("Módulo Entregas não contratado");
    expect(html).toContain(`data-manage="${COMPANY}"`);
    expect(html).not.toContain('data-panel="chat"');
  });

  it("opens the map panel of the company picked", async () => {
    answers = [
      [/\/user\/me$/, masterMe],
      [
        /\/delivery\/message-templates\?businessId=/,
        { status: 200, body: { data: [] } },
      ],
    ];

    const html = await render("admin", {
      view: "panel",
      businessId: COMPANY,
    });

    expect(html).toContain('data-panel="map"');
  });

  it("reads the waiting requests of the company picked, on the board", async () => {
    answers = [
      [/\/user\/me$/, masterMe],
      [
        /\/delivery\/message-templates\?businessId=/,
        { status: 200, body: { data: [] } },
      ],
      [/operation-summary/, summary],
    ];

    const html = await render("admin", { businessId: COMPANY });

    expect(html).toContain(`data-queue-business="${COMPANY}"`);
  });
});
