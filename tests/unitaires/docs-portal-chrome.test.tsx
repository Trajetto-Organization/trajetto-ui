import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Puts React in scope for the classic-runtime JSX of the modules below.
import { React, renderHtml } from "./helpers/render-html";

const navigation = vi.hoisted(() => ({ pathname: "/docs/erros" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

import DocsLayout from "@/app/docs/layout";
import {
  DocsHeader,
  isTopLinkCurrent,
} from "@/app/docs/_components/docs-header";
import { DocsPager } from "@/app/docs/_components/docs-pager";
import {
  API_DOCS_PATH,
  DOCS_DESKTOP_QUERY,
  DOCS_REFERENCE_PATH,
  READING_ORDER,
} from "@/app/docs/_lib/navigation";

void React;

/**
 * The portal's frame on the public site's standard (package docs-portal,
 * decision 16): the header that collapses into a menu like the site header,
 * the theme switch, the pager drawn as the site's cards, and the landmarks
 * axe flagged on /docs.
 */

const SRC = resolve(__dirname, "../../src");
const read = (path: string) => readFileSync(resolve(SRC, path), "utf8");

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("DocsPager", () => {
  it("draws previous and next as site cards with a label and the page title", () => {
    // "Erros" sits between "Idempotência" and "Limites de uso".
    const doc = parse(renderHtml(<DocsPager href="/docs/erros" />));
    const nav = doc.querySelector('nav[aria-label="Páginas vizinhas"]');
    const previous = nav?.querySelector<HTMLAnchorElement>(
      'a[data-pager="previous"]',
    );
    const next = nav?.querySelector<HTMLAnchorElement>('a[data-pager="next"]');

    expect(previous?.getAttribute("href")).toBe("/docs/idempotencia");
    expect(previous?.textContent).toBe("AnteriorIdempotência");
    expect(previous?.getAttribute("rel")).toBe("prev");
    expect(next?.getAttribute("href")).toBe("/docs/limites");
    expect(next?.textContent).toBe("PróximoLimites de uso");
    expect(next?.getAttribute("rel")).toBe("next");

    for (const card of [previous, next]) {
      const classes = card?.getAttribute("class") ?? "";

      // The legal pages' "Leia também" card: surface, hairline, lift on hover.
      expect(classes).toContain("group/arrow");
      expect(classes).toContain("rounded-[18px]");
      expect(classes).toContain("bg-site-surface");
      expect(classes).toContain("border-site-line");
      expect(classes).toContain("hover:-translate-y-[3px]");
      expect(classes).toContain("motion-reduce:hover:translate-y-0");
      expect(classes).toContain("focus-visible:ring-2");
    }
  });

  it("moves the arrows outward on hover and keyboard focus, still under reduced motion", () => {
    const doc = parse(renderHtml(<DocsPager href="/docs/erros" />));
    const arrowOf = (direction: string) =>
      doc
        .querySelector(`a[data-pager="${direction}"] svg`)
        ?.getAttribute("class") ?? "";

    const next = arrowOf("next");

    expect(next).toContain("group-hover/arrow:translate-x-1");
    expect(next).toContain("group-focus-visible/arrow:translate-x-1");
    expect(next).toContain("motion-reduce:!translate-x-0");

    // The previous arrow points back and slides left, not right.
    const previous = arrowOf("previous").split(/\s+/);

    expect(previous).toContain("lucide-arrow-left");
    expect(previous).toContain("group-hover/arrow:-translate-x-1");
    expect(previous).toContain("group-focus-visible/arrow:-translate-x-1");
    expect(previous).not.toContain("group-hover/arrow:translate-x-1");
    expect(previous).toContain("motion-reduce:!translate-x-0");
  });

  it("keeps the next card on the right on the first page and drops the previous one", () => {
    const first = READING_ORDER[0].href;
    const doc = parse(renderHtml(<DocsPager href={first} />));

    expect(doc.querySelector('a[data-pager="previous"]')).toBeNull();
    expect(
      doc.querySelector('a[data-pager="next"]')?.getAttribute("href"),
    ).toBe(READING_ORDER[1].href);
    // A placeholder holds the left column from 640px.
    expect(
      doc.querySelector("nav > span[aria-hidden]")?.getAttribute("class"),
    ).toContain("sm:block");
  });

  it("renders nothing for a page outside the reading order", () => {
    expect(renderHtml(<DocsPager href="/docs/console" />)).toBe("");
  });
});

describe("DocsLayout landmarks and theme", () => {
  it("has a single, named complementary landmark and a decorative logo image", () => {
    navigation.pathname = API_DOCS_PATH;
    const doc = parse(renderHtml(<DocsLayout>{null}</DocsLayout>));
    const asides = doc.querySelectorAll("aside");

    // axe landmark-unique: the guide's TOC column was a second, unnamed <aside>.
    expect(asides).toHaveLength(1);
    expect(asides[0].getAttribute("aria-label")).toBe("Menu da documentação");
    expect(read("app/docs/_components/guide-page.tsx")).not.toMatch(
      /^\s*<aside[\s>]/m,
    );
    expect(read("app/docs/referencia/page.tsx")).not.toMatch(
      /^\s*<aside[\s>]/m,
    );

    // axe image-redundant-alt: the link already reads "Trajetto".
    const logo = doc.querySelector('header a[href="/"]');

    expect(logo?.textContent).toBe("Trajetto");
    expect(logo?.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  it("sits on the site frame: site-root tokens and the sidebar at the header breakpoint", () => {
    const doc = parse(renderHtml(<DocsLayout>{null}</DocsLayout>));

    expect(doc.body.firstElementChild?.getAttribute("class")).toContain(
      "site-root",
    );
    expect(DOCS_DESKTOP_QUERY).toBe("(min-width: 960px)");
    expect(doc.querySelector("aside")?.getAttribute("class")).toContain(
      "min-[960px]:block",
    );
  });

  it("offers the theme icon in the bar from 640px", () => {
    const doc = parse(renderHtml(<DocsHeader />));
    const toggle = doc.querySelector('button[aria-label="Alternar tema"]');

    expect(toggle?.getAttribute("class")).toContain("hidden");
    expect(toggle?.getAttribute("class")).toContain("sm:inline-flex");
  });
});

describe("DocsHeader responsive navigation", () => {
  let host: HTMLDivElement;
  let root: Root;
  let mediaListeners: Array<() => void>;
  let desktop: boolean;

  beforeAll(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    navigation.pathname = "/docs/erros";
    desktop = false;
    mediaListeners = [];
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return query === DOCS_DESKTOP_QUERY ? desktop : false;
      },
      media: query,
      addEventListener: (_: string, listener: () => void) =>
        mediaListeners.push(listener),
      removeEventListener: () => {},
    }));
    document.documentElement.style.overflow = "";
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<DocsHeader />));
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  const menuButton = () =>
    host.querySelector<HTMLButtonElement>(
      "button[aria-controls]",
    ) as HTMLButtonElement;
  const panel = () =>
    host.querySelector(`[id="${menuButton().getAttribute("aria-controls")}"]`);
  const press = (key: string, init: KeyboardEventInit = {}) =>
    act(() => {
      (document.activeElement ?? host).dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, ...init }),
      );
    });

  it("shows the full nav from 960px and a menu button below it", () => {
    const nav = host.querySelector('nav[aria-label="Seções da documentação"]');

    expect(nav?.getAttribute("class")).toMatch(/\bhidden\b/);
    expect(nav?.getAttribute("class")).toContain("min-[960px]:flex");
    expect(
      [...(nav?.querySelectorAll("a") ?? [])].map((link) => link.textContent),
    ).toEqual(["Guias", "Referência", "Console interativo (abre em nova aba)"]);
    expect(menuButton().getAttribute("class")).toContain("min-[960px]:hidden");
    expect(menuButton().getAttribute("aria-label")).toBe(
      "Abrir menu da documentação",
    );
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(panel()).toBeNull();
  });

  it("opens a panel with every section, the theme control and the platform entry", () => {
    act(() => menuButton().click());

    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    expect(menuButton().getAttribute("aria-label")).toBe(
      "Fechar menu da documentação",
    );

    const sections = panel()?.querySelector('nav[aria-label="Documentação"]');

    expect(sections?.querySelectorAll("a").length).toBeGreaterThanOrEqual(
      READING_ORDER.length,
    );
    expect(
      sections?.querySelector('a[href="/docs/referencia"]'),
    ).not.toBeNull();
    expect(panel()?.querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(panel()?.querySelector('a[href="/login"]')?.textContent).toBe(
      "Acessar plataforma",
    );

    // The page behind is locked and focus lands on the current page.
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.activeElement?.getAttribute("aria-current")).toBe("page");
    expect(document.activeElement?.textContent).toBe("Erros");
  });

  it("closes on Escape, giving focus back to the button and the scroll to the page", () => {
    act(() => menuButton().click());
    press("Escape");

    expect(panel()).toBeNull();
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menuButton());
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("keeps Tab inside the header while the menu is open", () => {
    act(() => menuButton().click());

    const focusables = [
      ...host.querySelectorAll<HTMLElement>("header a[href], header button"),
    ].filter((element) => element.getAttribute("tabindex") !== "-1");
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    act(() => last.focus());
    press("Tab");
    expect(document.activeElement).toBe(first);

    press("Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes when the window grows past 960px and after a navigation", () => {
    act(() => menuButton().click());
    desktop = true;
    act(() => mediaListeners.forEach((listener) => listener()));
    expect(panel()).toBeNull();

    desktop = false;
    act(() => menuButton().click());
    expect(panel()).not.toBeNull();

    navigation.pathname = "/docs/limites";
    act(() => root.render(<DocsHeader />));
    expect(panel()).toBeNull();
  });

  it("marks the reference or the guides as current", () => {
    expect(isTopLinkCurrent(DOCS_REFERENCE_PATH, DOCS_REFERENCE_PATH)).toBe(
      true,
    );
    expect(isTopLinkCurrent(API_DOCS_PATH, DOCS_REFERENCE_PATH)).toBe(false);
    expect(isTopLinkCurrent(API_DOCS_PATH, "/docs/erros")).toBe(true);
    expect(
      host.querySelector(
        'nav[aria-label="Seções da documentação"] [aria-current="page"]',
      )?.textContent,
    ).toBe("Guias");
  });
});
