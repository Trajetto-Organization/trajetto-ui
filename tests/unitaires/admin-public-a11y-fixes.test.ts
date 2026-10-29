// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";

import {
  measureRenderedContrast,
  themeTokens,
} from "./helpers/rendered-contrast";
import { React, renderHtml } from "./helpers/render-html";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs" }));

import { ScrollArea } from "@/components/ui/scroll-area";
import { baseMdxComponents } from "@/components/mdx";
import { Callout } from "@/components/mdx/callout";
import { MdxLink } from "@/components/mdx/mdx-link";
import { StatCard } from "@/app/(protected)/_components/shared/stats/stat-card";
import { NOTIFICATION_ACCENT_CLASS } from "@/app/(protected)/_components/shared/notification-visuals";
import { DocsSidebarNav } from "@/app/docs/_components/docs-sidebar-nav";

/**
 * The defects tests/a11y/admin-and-public.spec.ts found the first time /admin
 * and the public site were scanned with axe, each held here on the markup
 * that had it (red before each fix, green after):
 *
 * - colour contrast: the notification count (white on #f50057, 4.18:1), the
 *   warning value of the stat cards (yellow-600 on white, 2.94:1 — under even
 *   the 3:1 of large text), the brand pink as text on its own 10% tint (the
 *   docs menu's current page, 4.02:1) and inside a callout (the guides'
 *   links, 4.49:1);
 * - regions that scroll with nothing focusable inside (the legal pages'
 *   tables, the showcases of the home): out of a keyboard's reach.
 */
const SOURCES = {
  tokens: themeTokens(
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ),
};

function contrastFailures(html: string) {
  const window = new Window();
  window.document.body.innerHTML = html;

  const { findings, measured } = measureRenderedContrast(
    window.document as unknown as Document,
    SOURCES,
  );

  window.close();

  return {
    measured,
    failing: findings
      .filter(({ ratio, floor }) => ratio < floor)
      .map(
        ({ text, theme, ratio, where }) =>
          `${theme} ${ratio.toFixed(2)}:1 "${text}" (${where})`,
      ),
  };
}

function parse(html: string): Document {
  const window = new Window();
  window.document.body.innerHTML = html;

  return window.document as unknown as Document;
}

describe("contrast of what axe failed", () => {
  it("the notification count (white on the accent)", () => {
    const { measured, failing } = contrastFailures(
      renderHtml(
        React.createElement(
          "span",
          {
            className: `text-[10px] font-bold text-white ${NOTIFICATION_ACCENT_CLASS}`,
          },
          "10",
        ),
      ),
    );

    expect(measured).toBeGreaterThan(0);
    expect(failing).toEqual([]);
  });

  it("the value of a warning card", () => {
    const { measured, failing } = contrastFailures(
      renderHtml(
        React.createElement(StatCard, {
          title: "Pendentes",
          value: "0 (0%)",
          variant: "warning",
        } as never),
      ),
    );

    expect(measured).toBeGreaterThan(0);
    expect(failing).toEqual([]);
  });

  it("the current page in the docs menu", () => {
    const { measured, failing } = contrastFailures(
      renderHtml(React.createElement(DocsSidebarNav)),
    );

    expect(measured).toBeGreaterThan(0);
    expect(failing).toEqual([]);
  });

  it("a guide link inside a callout", () => {
    const { measured, failing } = contrastFailures(
      renderHtml(
        React.createElement(
          Callout,
          { type: "info" } as never,
          React.createElement(
            MdxLink,
            { href: "/docs/comeco-rapido" },
            "começo rápido",
          ),
        ),
      ),
    );

    expect(measured).toBeGreaterThan(0);
    expect(failing).toEqual([]);
  });
});

describe("regions that scroll and the keyboard reaches", () => {
  it("the markdown table is a named, focusable region", () => {
    const table = baseMdxComponents.table as (
      props: object,
    ) => React.ReactElement;
    const document = parse(
      renderHtml(table({ children: React.createElement("tbody") })),
    );
    const region = document.querySelector('[role="region"]');

    // Outside the MDX pipeline nothing names the section: the plain fallback.
    expect(region?.getAttribute("aria-label")).toBe("Tabela");
    expect(region?.getAttribute("tabindex")).toBe("0");
  });

  it("and carries the name of the section the MDX pipeline gives it", () => {
    const table = baseMdxComponents.table as (
      props: object,
    ) => React.ReactElement;
    const html = renderHtml(
      table({
        "data-table-label": "Tabela: Limites",
        children: React.createElement("tbody"),
      }),
    );

    expect(
      parse(html).querySelector('[role="region"]')?.getAttribute("aria-label"),
    ).toBe("Tabela: Limites");
    expect(html).not.toContain("data-table-label");
  });

  it("and so does the code block", () => {
    const pre = baseMdxComponents.pre as (props: object) => React.ReactElement;
    const document = parse(renderHtml(pre({ children: "npm i" })));

    expect(document.querySelector("pre")?.getAttribute("tabindex")).toBe("0");
  });

  it("a labelled ScrollArea exposes the viewport to the keyboard", () => {
    const document = parse(
      renderHtml(
        React.createElement(
          ScrollArea,
          { viewportLabel: "Quadro Kanban de exemplo" } as never,
          "conteúdo",
        ),
      ),
    );
    const viewport = document.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    expect(viewport?.getAttribute("tabindex")).toBe("0");
    expect(viewport?.getAttribute("role")).toBe("region");
    expect(viewport?.getAttribute("aria-label")).toBe(
      "Quadro Kanban de exemplo",
    );
  });

  it("and without a label stays as it was (no extra Tab stop)", () => {
    const document = parse(
      renderHtml(React.createElement(ScrollArea, null, "conteúdo")),
    );

    expect(
      document
        .querySelector("[data-radix-scroll-area-viewport]")
        ?.hasAttribute("tabindex"),
    ).toBe(false);
  });
});
