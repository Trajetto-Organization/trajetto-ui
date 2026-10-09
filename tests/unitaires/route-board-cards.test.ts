import { createElement } from "react";
import { renderHtml } from "./helpers/render-html";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The cards above the routes board, as the real page composes them
 * (decision 8.8).
 *
 * The API counts the status cards WITHOUT the status filter (disjunctive
 * rule), while the pager total counts WITH it. The page handed the pager
 * total to the cards as "Total de Rotas", so with a status picked the two
 * sets mixed: "Concluídas 3 (150%)" over a total of 2.
 *
 * The real server component runs with the API answered by a stub; the table
 * and the client widgets around the cards are placeholders.
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

vi.mock("@/features/routes/page-actions", () => ({
  RoutesPageActions: () => null,
}));
vi.mock("@/features/routes/realtime", () => ({ RoutesRealtime: () => null }));

vi.mock("@/features/routes/table", () => ({
  RoutesTable: ({ meta }: { meta: { total: number } }) =>
    createElement("table", { "data-pager-total": meta.total }),
}));

// The meta line of the list: the pager total and the status tally.
const listMeta = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock("@/lib/parse-nd-json", () => ({
  parseNDJSON: async () => ({ meta: listMeta.current, data: [] }),
}));

import { RoutesContent } from "@/features/routes/content";

const requested: string[] = [];

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  requested.length = 0;

  vi.stubGlobal("fetch", async (input: string) => {
    requested.push(String(input));

    return new Response("", { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The number each card shows, by title, as the page renders it. */
function cards(html: string): Record<string, string> {
  const host = document.createElement("div");
  host.innerHTML = html;

  const out: Record<string, string> = {};

  for (const title of [
    "Total de Rotas",
    "Aguardando liberação",
    "Em andamento",
    "Concluídas",
  ]) {
    const node = [...host.querySelectorAll("*")].find(
      (element) =>
        element.children.length === 0 && element.textContent?.trim() === title,
    );

    expect(node, `cartão ${title} não encontrado`).toBeDefined();

    // The card root holds the title, the value and the description.
    let card = node!.parentElement;

    while (card && !/\d/.test(card.textContent?.replace(title, "") ?? "")) {
      card = card.parentElement;
    }

    out[title] = card?.textContent?.replace(title, "") ?? "";
  }

  return out;
}

describe("the routes board cards with a status filter applied", () => {
  it("count one set: the total and the percentage never mix the pager's", async () => {
    // The route-list-http fixture with status=IN_PROGRESS: the pager holds
    // the 2 routes on the street, the tally counts all 12 statuses.
    listMeta.current = {
      total: 2,
      page: 1,
      pageSize: 10,
      searchMeta: {
        statusCounts: {
          PLANNED: 4,
          RELEASED: 2,
          IN_PROGRESS: 2,
          COMPLETED: 3,
          CANCELLED: 1,
        },
      },
    };

    const html = renderHtml(
      await RoutesContent({
        mode: "dashboard",
        searchParams: { status: "IN_PROGRESS" },
        token: "token",
      }),
    );

    // The facet reached the API, and the pager keeps its own total.
    expect(requested[0]).toContain("status=IN_PROGRESS");
    expect(html).toContain('data-pager-total="2"');

    const values = cards(html);

    // Red before: "Total de Rotas 2" and "Concluídas 3 (150%)".
    expect(values["Total de Rotas"]).toContain("12");
    expect(values["Concluídas"]).toContain("3 (25%)");
    expect(values["Concluídas"]).not.toContain("150%");
    expect(values["Em andamento"]).toContain("2");
    expect(values["Aguardando liberação"]).toContain("6");
  });
});
