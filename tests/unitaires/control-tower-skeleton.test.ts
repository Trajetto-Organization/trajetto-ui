import { createElement } from "react";

import { describe, expect, it, vi } from "vitest";

import { renderHtml } from "./helpers/render-html";

/**
 * The Torre's loading states in the shape of the view being opened.
 *
 * Both the page's Suspense fallback and loading.tsx drew Rotas — six cards
 * over the board — whatever the URL asked for, so opening Atendimentos or
 * the map showed one layout and jumped to another. The menu now opens the
 * last view chosen, which made the wrong shape the common case.
 */
const navigation = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

import { ControlTowerContentSkeleton } from "@/features/control-tower/skeleton";
import { ControlTowerRouteLoading } from "@/features/control-tower/skeleton/route-loading";

const cards = (html: string) => (html.match(/h-\[142px\]/g) ?? []).length;

describe("the Torre's loading state", () => {
  it("draws Rotas' six cards over the board when no view is named", () => {
    const html = renderHtml(
      createElement(ControlTowerContentSkeleton, { withSelector: false }),
    );

    expect(html).toContain('data-skeleton-view="routes"');
    expect(cards(html)).toBe(6);
  });

  it("draws the map for Painel, the two panes for Atendimentos, the queue for Auditoria", () => {
    const panel = renderHtml(
      createElement(ControlTowerContentSkeleton, {
        withSelector: false,
        view: "panel",
      }),
    );
    expect(panel).toContain("md:h-[480px]");
    expect(cards(panel)).toBe(0);

    const tickets = renderHtml(
      createElement(ControlTowerContentSkeleton, {
        withSelector: false,
        view: "tickets",
      }),
    );
    expect(tickets).toContain("lg:w-96");
    expect(cards(tickets)).toBe(0);

    const audit = renderHtml(
      createElement(ControlTowerContentSkeleton, {
        withSelector: false,
        view: "audit",
      }),
    );
    expect(audit).toContain("h-96");
    expect(cards(audit)).toBe(0);

    const occurrences = renderHtml(
      createElement(ControlTowerContentSkeleton, {
        withSelector: false,
        view: "occurrences",
      }),
    );
    // The feed's three cards over its table.
    expect(cards(occurrences)).toBe(3);
    expect(occurrences).toContain("divide-y");
  });

  it("loading.tsx reads the view from the URL it is opening", () => {
    navigation.search = "view=tickets";

    const html = renderHtml(
      createElement(ControlTowerRouteLoading, { withSelector: true }),
    );

    expect(html).toContain('data-skeleton-view="tickets"');

    navigation.search = "view=constructor";

    expect(
      renderHtml(
        createElement(ControlTowerRouteLoading, { withSelector: true }),
      ),
    ).toContain('data-skeleton-view="routes"');
  });
});
