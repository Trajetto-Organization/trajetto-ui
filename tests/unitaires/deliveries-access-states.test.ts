import { createElement, type ReactNode } from "react";
import { renderHtml } from "./helpers/render-html";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What the Entregas page shows when the API refuses (DLV-RO-1, DLV-RO-2,
 * DLV-OCC-2, MASTER-MOD-1).
 *
 * The page read every 403 as "Módulo Entregas não contratado": a
 * BUSINESS_USER with Entregas read-only opened Ocorrências or Tipos de
 * Ocorrência — tabs of a key the profile lacks — and was told the company
 * had not hired a module it had. The tabs were drawn for everybody.
 *
 * The real server component runs here with the API answered by a stub; the
 * client panels around it are placeholders, because what is under test is
 * which state the page picks.
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
  ProtectedPageToolbar: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/features/deliveries/tabs", () => ({
  DeliveriesTabs: ({
    activeTab,
    allowedTabs,
  }: {
    activeTab: string;
    allowedTabs?: string[];
  }) =>
    createElement("nav", {
      "data-active": activeTab,
      "data-tabs": (allowedTabs ?? []).join(","),
    }),
}));

vi.mock("@/features/deliveries/table", () => ({
  DeliveriesTable: ({
    activeTab,
    searchMeta,
    catalogServerMode,
  }: {
    activeTab: string;
    searchMeta?: Record<string, unknown>;
    catalogServerMode?: boolean;
  }) =>
    createElement("table", {
      "data-table": activeTab,
      "data-search-meta": searchMeta ? JSON.stringify(searchMeta) : "none",
      "data-catalog-server": catalogServerMode ? "on" : "off",
    }),
}));

vi.mock("@/features/deliveries/page-actions", () => ({
  DeliveriesPageActions: () => null,
}));
vi.mock("@/features/deliveries/stats", () => ({ DeliveriesStats: () => null }));
vi.mock("@/features/deliveries/realtime", () => ({
  DeliveriesRealtime: () => null,
}));
// The page renders its panels through one lazy-loading module (each panel is
// its own chunk); what is checked here is what the page hands each of them.
vi.mock("@/features/deliveries/content/lazy-panels", () => ({
  MonitoringPanel: () =>
    createElement("section", { "data-panel": "monitoring" }),
  ChatPanel: () => createElement("section", { "data-panel": "chat" }),
  MessageTemplatesPanel: ({ businessId }: { businessId: string }) =>
    createElement("section", {
      "data-panel": "message-templates",
      "data-business": businessId,
    }),
  ProofAuditsPanel: ({ businessId }: { businessId?: string }) =>
    createElement("section", {
      "data-panel": "proof-audits",
      "data-business": businessId ?? "",
    }),
}));

// The meta line the next list answers with; searchMeta is what the server
// tables read.
const listMeta = vi.hoisted(() => ({
  current: { total: 0, page: 1, pageSize: 10 } as Record<string, unknown>,
}));

vi.mock("@/lib/parse-nd-json", () => ({
  parseNDJSON: async () => ({ meta: listMeta.current, data: [] }),
}));
vi.mock(
  "@/components/shared/custom/access-error-state/manage-modules-button",
  () => ({
    ManageModulesButton: ({ businessId }: { businessId: string }) =>
      createElement(
        "button",
        { "data-manage": businessId },
        "Gerenciar módulos",
      ),
  }),
);

// A marker, so the test sees which component drew the state: the shared one
// renders the same title the hand-built EmptyState did (decision 3.7).
vi.mock("@/components/shared/custom/select-business-empty-state", () => ({
  SelectBusinessEmptyState: ({ description }: { description: string }) =>
    createElement("div", { "data-select-business": "" }, description),
}));

import { DeliveriesContent } from "@/features/deliveries/content";

const COMPANY = "018f0000-0000-7000-8000-00000000c0de";

type Answer = { status: number; body: unknown };

let answers: Array<[RegExp, Answer]> = [];
const requested: string[] = [];

const readOnlyMe: Answer = {
  status: 200,
  body: {
    user: {
      role: "BUSINESS_USER",
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
  listMeta.current = { total: 0, page: 1, pageSize: 10 };
  vi.unstubAllGlobals();
});

async function render(
  mode: "admin" | "dashboard",
  searchParams: Record<string, string>,
): Promise<string> {
  const element = await DeliveriesContent({
    mode,
    searchParams,
    token: "token",
  });

  return renderHtml(element);
}

describe("a BUSINESS_USER with Entregas read-only", () => {
  it("is never told the company did not hire Entregas for a tab of another key", async () => {
    answers = [
      [/\/user\/me$/, readOnlyMe],
      [/list-delivery/, { status: 200, body: "" }],
      [
        /list-occurrence-type/,
        {
          status: 403,
          body: { code: "PERMISSION_DENIED", message: "Sem acesso." },
        },
      ],
    ];

    const html = await render("dashboard", { tab: "occurrence-types" });

    expect(html).not.toContain("não contratado");

    // The forbidden tab from the link opens the first readable one instead,
    // and is not drawn in the strip.
    expect(html).toContain('data-active="deliveries"');
    expect(html).toContain('data-table="deliveries"');
    expect(html).not.toMatch(/data-tabs="[^"]*occurrence-types/);
    expect(requested.some((url) => url.includes("list-occurrence-type"))).toBe(
      false,
    );
  });
});

describe("a 403 is said as what it is", () => {
  it("shows 'sem permissão' for PERMISSION_DENIED", async () => {
    answers = [
      // The session could not be read: every tab is drawn and the API
      // answers for itself.
      [/\/user\/me$/, { status: 503, body: {} }],
      [
        /list-delivery/,
        {
          status: 403,
          body: {
            code: "PERMISSION_DENIED",
            message: "Seu perfil não inclui esta seção.",
          },
        },
      ],
    ];

    const html = await render("dashboard", { tab: "deliveries" });

    expect(html).toContain("Sem permissão para esta seção");
    expect(html).toContain("Seu perfil não inclui esta seção.");
    expect(html).not.toContain("não contratado");
  });

  it("shows the module state only for MODULE_NOT_ENABLED", async () => {
    answers = [
      [/\/user\/me$/, { status: 503, body: {} }],
      [/list-delivery/, { status: 403, body: { code: "MODULE_NOT_ENABLED" } }],
    ];

    const html = await render("dashboard", { tab: "deliveries" });

    expect(html).toContain("Módulo Entregas não contratado");
    expect(html).toContain("sua empresa");
  });

  it("does the same on the monitoring board", async () => {
    answers = [
      [/\/user\/me$/, { status: 503, body: {} }],
      [
        /operation-summary/,
        { status: 403, body: { code: "PERMISSION_DENIED" } },
      ],
    ];

    const html = await render("dashboard", { tab: "monitoring" });

    expect(html).toContain("Sem permissão para esta seção");
    expect(html).not.toContain("não contratado");
  });

  it("and on the chat's probe", async () => {
    answers = [
      [/\/user\/me$/, { status: 503, body: {} }],
      [/list-threads/, { status: 403, body: { code: "TENANT_INACTIVE" } }],
    ];

    const html = await render("dashboard", { tab: "chat" });

    expect(html).toContain("Empresa desativada");
    expect(html).not.toContain("não contratado");
  });
});

describe("the MASTER on /admin/deliveries (decisions 3.7 and 4.3)", () => {
  const masterMe: Answer = {
    status: 200,
    body: { user: { role: "MASTER", driverId: null, enabledModules: [] } },
  };

  /** The module's own route, asked for the selected company before any tab. */
  const probe = /\/delivery\/message-templates\?businessId=/;

  it("asks for a company with the shared state, and fetches nothing", async () => {
    answers = [[/\/user\/me$/, masterMe]];

    const html = await render("admin", { tab: "deliveries" });

    expect(html).toContain("data-select-business");
    expect(requested.filter((url) => !url.endsWith("/user/me"))).toEqual([]);
  });

  it("sees the module state for a company without it, with the way to enable it", async () => {
    answers = [
      [/\/user\/me$/, masterMe],
      [
        probe,
        {
          status: 403,
          body: {
            code: "MODULE_NOT_ENABLED",
            message: "O módulo Entregas não está habilitado para esta empresa.",
          },
        },
      ],
      [/list-delivery/, { status: 200, body: "" }],
    ];

    const html = await render("admin", {
      tab: "deliveries",
      businessId: COMPANY,
    });

    expect(html).toContain("Módulo Entregas não contratado");
    expect(html).toContain("esta empresa");
    expect(html).toContain(`data-manage="${COMPANY}"`);

    // Decided before the tab is fetched: the client panels show it too.
    expect(requested.some((url) => url.includes("list-delivery"))).toBe(false);
  });

  it("sees a switched-off company as switched off, with no module button", async () => {
    // The plan endpoint listed a switched-off company's modules as if it
    // could be operated; the page offered "Gerenciar módulos" for it.
    answers = [
      [/\/user\/me$/, masterMe],
      [
        probe,
        {
          status: 403,
          body: {
            code: "TENANT_INACTIVE",
            message: "Esta empresa está desativada.",
          },
        },
      ],
    ];

    const html = await render("admin", {
      tab: "deliveries",
      businessId: COMPANY,
    });

    expect(html).toContain("Empresa desativada");
    expect(html).not.toContain("não contratado");
    expect(html).not.toContain("data-manage");
  });

  it("sees the tables of a company that hired it", async () => {
    answers = [
      [/\/user\/me$/, masterMe],
      [probe, { status: 200, body: { data: [] } }],
      [/list-delivery/, { status: 200, body: "" }],
    ];

    const html = await render("admin", {
      tab: "deliveries",
      businessId: COMPANY,
    });

    expect(html).toContain('data-table="deliveries"');
    expect(html).not.toContain("não contratado");
  });

  it("sees the same state on a client-panel tab (chat)", async () => {
    answers = [
      [/\/user\/me$/, masterMe],
      [probe, { status: 403, body: { code: "MODULE_NOT_ENABLED" } }],
      [/list-threads/, { status: 200, body: { data: [] } }],
    ];

    const html = await render("admin", { tab: "chat", businessId: COMPANY });

    expect(html).toContain("Módulo Entregas não contratado");
    expect(html).not.toContain('data-panel="chat"');
  });
});

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

/** The query string the page sent to the list endpoint of a tab. */
function listQuery(fragment: string): URLSearchParams {
  const url = requested.find((candidate) => candidate.includes(fragment));

  if (!url)
    throw new Error(`no request to ${fragment}: ${requested.join(" ")}`);

  return new URL(url).searchParams;
}

describe("the tables answered on the server (decision 8.8)", () => {
  // The sort and facet params were in the URL but never reached the API:
  // the page sent page, pageSize, search and businessId only, and did not
  // hand the table the searchMeta that turns its server mode on.
  it("sends the deliveries table's sort and facets, and gives the table its searchMeta", async () => {
    listMeta.current = {
      total: 1,
      page: 1,
      pageSize: 10,
      searchMeta: { statusCounts: { PENDING: 1 } },
    };

    answers = [
      [/\/user\/me$/, adminMe],
      [/list-delivery/, { status: 200, body: "" }],
    ];

    const html = await render("dashboard", {
      tab: "deliveries",
      sort: "status",
      order: "desc",
      status: "PENDING,FAILED",
      search: "nf 123",
    });

    const query = listQuery("/delivery/list-delivery");

    expect(query.get("sort")).toBe("status");
    expect(query.get("order")).toBe("desc");
    expect(query.get("status")).toBe("PENDING,FAILED");
    expect(query.get("search")).toBe("nf 123");

    expect(html).toContain("statusCounts");
  });

  it("sends the occurrence feed's sort and facets", async () => {
    answers = [
      [/\/user\/me$/, adminMe],
      [/list-occurrences/, { status: 200, body: "" }],
    ];

    await render("dashboard", {
      tab: "occurrences",
      sort: "typeName",
      order: "asc",
      severity: "blocking",
    });

    const query = listQuery("/delivery/list-occurrences");

    expect(query.get("sort")).toBe("typeName");
    expect(query.get("order")).toBe("asc");
    expect(query.get("severity")).toBe("blocking");
  });

  // SERVER-TABLE-CATALOG: Embarcadores, Tipos, Motivos and Importações
  // filtered and sorted only the loaded page, although their listings take
  // sort, order and the facets (decision 8.8).
  it.each([
    [
      "shippers",
      /list-shipper/,
      "/shipper/list-shipper",
      { sort: "name", order: "desc", status: "inactive" },
    ],
    [
      "occurrence-types",
      /list-occurrence-type/,
      "/occurrence-type/list-occurrence-type",
      {
        sort: "updated_at",
        order: "asc",
        status: "active",
        blocking: "yes",
        photo: "no",
      },
    ],
    [
      "status-change-reasons",
      /list-status-change-reason/,
      "/status-change-reason/list-status-change-reason",
      { sort: "name", order: "asc", status: "active" },
    ],
    [
      "imports",
      /list-imports/,
      "/import/list-imports",
      { sort: "invalid", order: "desc", status: "REVERSED", source: "NFE_XML" },
    ],
  ] as const)(
    "sends the %s tab's sort and facets, and answers its table on the server",
    async (tab, pattern, path, params) => {
      answers = [
        [/\/user\/me$/, adminMe],
        [pattern, { status: 200, body: "" }],
      ];

      const html = await render("dashboard", { tab, ...params });

      const query = listQuery(path);

      for (const [key, value] of Object.entries(params)) {
        expect(query.get(key), key).toBe(value);
      }

      expect(html).toContain('data-catalog-server="on"');
    },
  );

  it("sends only what the endpoint knows", async () => {
    answers = [
      [/\/user\/me$/, adminMe],
      [/list-shipper/, { status: 200, body: "" }],
    ];

    await render("dashboard", {
      tab: "shippers",
      sort: "status",
      order: "desc",
      status: "PENDING",
    });

    const query = listQuery("/shipper/list-shipper");

    expect(query.has("sort")).toBe(false);
    expect(query.has("order")).toBe(false);
    expect(query.has("status")).toBe(false);
  });
});

describe("the client panels act on a company (DLVB-03)", () => {
  // Handed "" on /dashboard, the message templates were listed with
  // `?businessId=` — a 400 the panel showed as "nothing written" — and
  // saved to `/message-template/`.
  it("gives the message templates the session's company on /dashboard", async () => {
    answers = [[/\/user\/me$/, adminMe]];

    const html = await render("dashboard", { tab: "message-templates" });

    expect(html).toContain('data-panel="message-templates"');
    expect(html).toContain(`data-business="${COMPANY}"`);
  });

  it("and the proof audit queue", async () => {
    answers = [[/\/user\/me$/, adminMe]];

    const html = await render("dashboard", { tab: "proof-audits" });

    expect(html).toContain('data-panel="proof-audits"');
    expect(html).toContain(`data-business="${COMPANY}"`);
  });

  it("gives them the company picked on /admin", async () => {
    answers = [
      [
        /\/user\/me$/,
        {
          status: 200,
          body: { user: { role: "MASTER", businessId: null, driverId: null } },
        },
      ],
      [
        /\/delivery\/message-templates\?businessId=/,
        { status: 200, body: { data: [] } },
      ],
    ];

    const html = await render("admin", {
      tab: "message-templates",
      businessId: COMPANY,
    });

    expect(html).toContain(`data-business="${COMPANY}"`);
  });
});
