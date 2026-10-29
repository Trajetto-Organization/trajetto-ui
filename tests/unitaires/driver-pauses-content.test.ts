import { createElement } from "react";
import { renderHtml } from "./helpers/render-html";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The pause report page's server content (decision 6.1), with the API
 * answered by a stub: which company it asks for, what reaches the API, and
 * each state the page can be in. The table and the client widgets of the band
 * are placeholders; the cards and the empty and error states are real.
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
  ProtectedPageToolbar: () => null,
}));

vi.mock("@/features/driver-pauses/page-actions", () => ({
  DriverPausesPageActions: () => null,
}));

vi.mock(
  "@/components/shared/custom/access-error-state/manage-modules-button",
  () => ({
    ManageModulesButton: () => null,
  }),
);

vi.mock("@/features/driver-pauses/table", () => ({
  DriverPausesTable: ({
    meta,
    data,
    responseError,
    timeZone,
    emptyMessage,
  }: {
    meta: { total: number };
    data: unknown[];
    responseError: { errorMessage: string };
    timeZone?: string;
    emptyMessage?: unknown;
  }) =>
    createElement("table", {
      "data-total": meta.total,
      "data-rows": data.length,
      "data-error": responseError.errorMessage,
      "data-zone": timeZone ?? "",
      // null: the page explains the empty period, the table says nothing.
      "data-empty-message": emptyMessage === null ? "none" : "table",
    }),
}));

import { DriverPausesContent } from "@/features/driver-pauses/content";

const COMPANY = "018f0000-0000-7000-8000-00000000000a";

const requested: string[] = [];

const answers = vi.hoisted(() => ({
  report: { status: 200, body: {} as unknown },
}));

function report(overrides: Record<string, unknown> = {}) {
  return {
    timeZone: "America/Manaus",
    from: "2026-09-22",
    to: "2026-09-28",
    rules: {},
    total: 3,
    page: 1,
    pageSize: 10,
    searchMeta: {
      days: 3,
      drivers: 2,
      pauses: 5,
      daysWithAlerts: 1,
      facets: { driverId: [], flag: [] },
    },
    data: [{}, {}, {}],
    ...overrides,
  };
}

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  requested.length = 0;
  answers.report = { status: 200, body: report() };

  vi.stubGlobal("fetch", async (input: string) => {
    const url = String(input);

    requested.push(url);

    if (url.endsWith("/user/me")) {
      return new Response(
        JSON.stringify({
          user: { role: "BUSINESS_ADMIN", businessId: COMPANY },
        }),
        { status: 200 },
      );
    }

    return new Response(JSON.stringify(answers.report.body), {
      status: answers.report.status,
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the pause report page", () => {
  it("asks the master to choose a company, and asks the API nothing", async () => {
    const html = renderHtml(
      await DriverPausesContent({
        mode: "admin",
        searchParams: {},
        token: "token",
      }),
    );

    expect(html).toContain("Selecione uma empresa");
    expect(requested).toEqual([]);
  });

  it("reads the session's company on /dashboard and forwards the period and filters", async () => {
    const html = renderHtml(
      await DriverPausesContent({
        mode: "dashboard",
        searchParams: {
          from: "2026-09-22",
          to: "2026-09-28",
          flag: "MEAL_SHORT",
          page: "2",
        },
        token: "token",
      }),
    );

    const call = requested.find((url) => url.includes("/driver-pause/report/"));

    expect(call).toBeDefined();

    const url = new URL(call!);

    expect(url.pathname).toBe(`/driver-pause/report/${COMPANY}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "2026-09-22",
      to: "2026-09-28",
      flag: "MEAL_SHORT",
      page: "2",
      pageSize: "10",
    });

    // The cards read the API's counts; the table gets the company's zone.
    expect(html).toContain("Dias com alerta");
    expect(html).toContain('data-total="3"');
    expect(html).toContain('data-zone="America/Manaus"');
    expect(html).not.toContain("driver-pauses-empty");
  });

  it("says so when the session's company cannot be read, and asks the report nothing", async () => {
    vi.stubGlobal("fetch", async (input: string) => {
      requested.push(String(input));

      return new Response("", { status: 503 });
    });

    const html = renderHtml(
      await DriverPausesContent({
        mode: "dashboard",
        searchParams: {},
        token: "token",
      }),
    );

    expect(html).toContain("Empresa não identificada");
    expect(html).not.toContain("Selecione uma empresa");
    expect(requested.some((url) => url.includes("/driver-pause/"))).toBe(false);
  });

  it("uses the master's pick on /admin", async () => {
    await DriverPausesContent({
      mode: "admin",
      searchParams: { businessId: COMPANY },
      token: "token",
    });

    expect(requested).toEqual([
      `http://api.test/driver-pause/report/${COMPANY}?page=1&pageSize=10`,
    ]);
  });

  it("says why the period is empty when nothing happened in it", async () => {
    answers.report = {
      status: 200,
      body: report({
        total: 0,
        data: [],
        searchMeta: {
          days: 0,
          drivers: 0,
          pauses: 0,
          daysWithAlerts: 0,
          facets: { driverId: [], flag: [] },
        },
      }),
    };

    const html = renderHtml(
      await DriverPausesContent({
        mode: "dashboard",
        searchParams: {},
        token: "token",
      }),
    );

    expect(html).toContain("driver-pauses-empty");
    expect(html).toContain("Nenhum motorista saiu com rota ou registrou pausa");
    expect(html).toMatch(/22\/09\/2026 \([^)]+\) a 28\/09\/2026/);

    // One message for one fact: the table adds no "Nenhum resultado".
    expect(html).toContain('data-empty-message="none"');
  });

  it("leaves the table's own sentence to a filter that matched nothing", async () => {
    answers.report = {
      status: 200,
      body: report({
        total: 0,
        data: [],
        searchMeta: {
          days: 0,
          drivers: 0,
          pauses: 0,
          daysWithAlerts: 0,
          facets: { driverId: [], flag: [] },
        },
      }),
    };

    const html = renderHtml(
      await DriverPausesContent({
        mode: "dashboard",
        searchParams: { flag: "MEAL_SHORT" },
        token: "token",
      }),
    );

    expect(html).not.toContain("driver-pauses-empty");
    expect(html).toContain('data-empty-message="table"');
  });

  it("tells a company without Entregas that the module is not hired", async () => {
    answers.report = {
      status: 403,
      body: {
        code: "MODULE_NOT_ENABLED",
        message: "O módulo Entregas não está habilitado.",
      },
    };

    const html = renderHtml(
      await DriverPausesContent({
        mode: "dashboard",
        searchParams: {},
        token: "token",
      }),
    );

    expect(html).toContain("Módulo Entregas não contratado");
  });

  it("shows the API's own sentence for a refused period", async () => {
    answers.report = {
      status: 400,
      body: {
        code: "PAUSE_REPORT_RANGE_INVALID",
        message: "O período pode ter no máximo 31 dias.",
      },
    };

    const html = renderHtml(
      await DriverPausesContent({
        mode: "dashboard",
        searchParams: {},
        token: "token",
      }),
    );

    expect(html).toContain(
      'data-error="O período pode ter no máximo 31 dias."',
    );
  });
});
