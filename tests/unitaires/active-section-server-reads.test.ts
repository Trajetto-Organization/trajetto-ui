import { createElement, type ReactNode } from "react";
import { renderHtml } from "./helpers/render-html";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Only the section on screen is read on the server.
 *
 * Opening Entregas cost 24 API calls in a production build: the session,
 * then the list of EVERY section — deliveries twice, shippers, imports,
 * occurrence types, status reasons, the occurrences, the summary and the
 * tickets — although one tab is drawn. The server page and the Torre's
 * views must ask the API for the open section alone (the strip's links no
 * longer prefetch the others either, section-links-prefetch.test.ts). The
 * readers are mocked and counted; the session is the only other read.
 */
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

const reads = vi.hoisted(() => ({
  lists: [] as string[],
  session: 0,
  refusals: [] as string[],
}));

vi.mock("@/features/deliveries/content/list-read", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/features/deliveries/content/list-read")
    >();

  return {
    ...original,
    readDeliveryList: async ({ section }: { section: string }) => {
      reads.lists.push(section);

      return {
        rows: [],
        meta: { total: 0, page: 1, pageSize: 10 },
        responseError: { error: false, errorMessage: "" },
        refusal: null,
        unauthorized: false,
      };
    },
  };
});

vi.mock("@/lib/session-access", () => ({
  fetchSessionAccess: async () => {
    reads.session += 1;

    return {
      role: "BUSINESS_ADMIN",
      permissions: [],
      enabledModules: ["DELIVERIES"],
      isDriver: false,
      businessId: "018f0000-0000-7000-8000-00000000c0de",
    };
  },
  fetchCompanyRefusal: async (_token: string, path: string) => {
    reads.refusals.push(path);
    return null;
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
    children?: ReactNode;
  }) => createElement("header", null, actions, children),
}));

vi.mock("@/features/deliveries/tabs", () => ({
  DeliveriesTabs: ({ activeTab }: { activeTab: string }) =>
    createElement("nav", { "data-active": activeTab }),
}));

vi.mock("@/features/deliveries/table", () => ({
  DeliveriesTable: ({ activeTab }: { activeTab: string }) =>
    createElement("table", { "data-table": activeTab }),
}));

vi.mock("@/features/deliveries/page-actions", () => ({
  DeliveriesPageActions: () => null,
}));
vi.mock("@/features/deliveries/stats", () => ({ DeliveriesStats: () => null }));
vi.mock("@/features/deliveries/realtime", () => ({
  DeliveriesRealtime: () => null,
}));

vi.mock("@/features/deliveries/content/lazy-panels", () => ({
  MonitoringPanel: () =>
    createElement("section", { "data-panel": "monitoring" }),
  ChatPanel: () => createElement("section", { "data-panel": "chat" }),
  ProofAuditsPanel: () =>
    createElement("section", { "data-panel": "proof-audits" }),
  MessageTemplatesPanel: () =>
    createElement("section", { "data-panel": "message-templates" }),
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
  ControlTowerViewTabs: () => createElement("nav"),
}));

vi.mock("@/features/control-tower/page-actions", () => ({
  ControlTowerPageActions: () => null,
}));

vi.mock("@/features/control-tower/views/lazy-views", () => ({
  ControlTowerContent: () => createElement("section", { "data-panel": "map" }),
  DeliveriesPageActions: () => null,
  OccurrenceAuthorizationQueue: () => null,
}));

import { DeliveriesContent } from "@/features/deliveries/content";
import { ControlTowerViews } from "@/features/control-tower/views";

/** Every request that left for the API without going through a reader. */
const requested: string[] = [];

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  reads.lists = [];
  reads.session = 0;
  reads.refusals = [];
  requested.length = 0;

  vi.stubGlobal("fetch", async (input: string) => {
    requested.push(String(input).replace("http://api.test", ""));

    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const ENTREGAS_TABS = [
  "deliveries",
  "shippers",
  "imports",
  "occurrence-types",
  "status-change-reasons",
] as const;

describe("Entregas reads only the open tab", () => {
  it("?tab=imports reads the imports, and no other list", async () => {
    const html = renderHtml(
      await DeliveriesContent({
        mode: "dashboard",
        searchParams: { tab: "imports" },
        token: "token",
      }),
    );

    expect(html).toContain('data-table="imports"');
    expect(reads.lists).toEqual(["imports"]);
    expect(requested).toEqual([]);
    expect(reads.session).toBe(1);
  });

  for (const tab of ENTREGAS_TABS) {
    it(`?tab=${tab} reads its own list once`, async () => {
      await DeliveriesContent({
        mode: "dashboard",
        searchParams: { tab },
        token: "token",
      });

      expect(reads.lists).toEqual([tab]);
      expect(requested).toEqual([]);
    });
  }

  it("the message templates read no list at all (the panel fetches its own)", async () => {
    const html = renderHtml(
      await DeliveriesContent({
        mode: "dashboard",
        searchParams: { tab: "message-templates" },
        token: "token",
      }),
    );

    expect(html).toContain('data-panel="message-templates"');
    expect(reads.lists).toEqual([]);
    expect(requested).toEqual([]);
  });
});

async function tower(view: string): Promise<string> {
  return renderHtml(
    await ControlTowerViews({
      mode: "dashboard",
      searchParams: { view },
      token: "token",
      tiles: null,
    }),
  );
}

describe("the Torre reads only the open view", () => {
  it("Auditoria: no list, no summary, no tickets probe", async () => {
    const html = await tower("audit");

    expect(html).toContain('data-panel="proof-audits"');
    expect(reads.lists).toEqual([]);
    expect(requested).toEqual([]);
  });

  it("Painel: nothing on the server (the map reads its own)", async () => {
    const html = await tower("panel");

    expect(html).toContain('data-panel="map"');
    expect(reads.lists).toEqual([]);
    expect(requested).toEqual([]);
  });

  it("Ocorrências: the occurrences only", async () => {
    await tower("occurrences");

    expect(reads.lists).toEqual(["occurrences"]);
    expect(requested).toEqual([]);
  });

  it("Atendimentos: the module probe only", async () => {
    await tower("tickets");

    expect(reads.lists).toEqual([]);
    expect(requested).toHaveLength(1);
    expect(requested[0]).toMatch(/^\/chat\/list-threads\?/);
  });

  it("Rotas: the day's summary only", async () => {
    await tower("routes");

    expect(reads.lists).toEqual([]);
    expect(requested).toEqual(["/delivery/operation-summary"]);
  });
});
