import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";
import postcss from "postcss";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CountUp, Reveal, type RevealVariant } from "@/components/site/reveal";

import { hasChromium } from "./helpers/measure-in-chromium";

/**
 * The scroll reveal of the public site (src/components/site/reveal.tsx).
 *
 * The old `.reveal` started at opacity 0 and only the IntersectionObserver
 * brought it back, so a visitor without JavaScript (or a crawler that does
 * not run it) got blank sections (PUB-21), and every waiting element kept a
 * promoted layer (`will-change`). The site Reveal inverts it: the server HTML
 * is the final state, and only an element still below the fold after
 * hydration is hidden, then shown when it scrolls in. These are the old
 * suite's guarantees, held on the new component.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const VARIANTS: RevealVariant[] = ["up", "fade", "grow-x", "grow-y"];
const GLOBALS_CSS = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

/** Every top-level or @media rule that mentions the reveal's attributes. */
function revealRules(): {
  selector: string;
  media: string | null;
  decls: Record<string, string>;
}[] {
  const found: {
    selector: string;
    media: string | null;
    decls: Record<string, string>;
  }[] = [];

  postcss.parse(GLOBALS_CSS).walkRules((rule) => {
    if (!/data-site-reveal/.test(rule.selector)) return;

    const decls: Record<string, string> = {};
    rule.each((node) => {
      if (node.type === "decl")
        decls[node.prop] = node.important
          ? `${node.value} !important`
          : node.value;
    });
    const media =
      rule.parent?.type === "atrule"
        ? (rule.parent as postcss.AtRule).params
        : null;

    found.push({ selector: rule.selector, media, decls });
  });

  return found;
}

describe("the server HTML is the final state", () => {
  it.each(VARIANTS)(
    "%s renders visible content with no reveal state",
    (variant) => {
      const html = renderToStaticMarkup(
        createElement(
          Reveal,
          { variant, id: `r-${variant}` },
          createElement("p", null, `Conteúdo ${variant}`),
        ),
      );

      expect(html).toContain(`Conteúdo ${variant}`);
      expect(html).not.toContain("data-site-reveal");
      expect(html).not.toMatch(/opacity\s*:\s*0/);
    },
  );

  it("a count shows its final value, not zero", () => {
    expect(renderToStaticMarkup(createElement(CountUp, { value: 127 }))).toBe(
      "<span>127</span>",
    );
  });
});

describe("the reveal's CSS, read from globals.css", () => {
  const rules = revealRules();

  it("is there to read, so the checks below mean something", () => {
    expect(rules.length).toBeGreaterThan(4);
  });

  it("hides only what the script marked hidden", () => {
    const hiding = rules.filter(
      ({ decls }) =>
        decls.opacity === "0" ||
        /scale[XY]?\(0\)|translate/.test(decls.transform ?? ""),
    );

    expect(hiding.length).toBeGreaterThan(0);
    for (const { selector } of hiding)
      expect(selector).toContain('[data-site-reveal="hidden"]');
  });

  it("promotes no layer for each waiting element (no will-change)", () => {
    expect(
      rules
        .filter(({ decls }) => "will-change" in decls)
        .map(({ selector }) => selector),
    ).toEqual([]);
  });

  it("with reduced motion, forces the final state even if the setting changes mid-visit", () => {
    const reduced = rules.filter(
      ({ media }) =>
        media?.replace(/\s+/g, " ") === "(prefers-reduced-motion: reduce)",
    );

    expect(
      reduced.some(
        ({ selector, decls }) =>
          selector === "[data-site-reveal]" &&
          /^none/.test(decls.transform ?? ""),
      ),
    ).toBe(true);
    expect(reduced.some(({ decls }) => /^1/.test(decls.opacity ?? ""))).toBe(
      true,
    );
  });
});

describe.skipIf(!hasChromium)(
  `the reveal's CSS in a browser${hasChromium ? "" : " — skipped: Chromium is not installed"}`,
  () => {
    async function computed(reducedMotion: "reduce" | "no-preference") {
      // Only the reveal's own rules: the page around it is not under test.
      const css = revealRules()
        .map(({ selector, media, decls }) => {
          const body = `${selector}{${Object.entries(decls)
            .map(([prop, value]) => `${prop}:${value}`)
            .join(";")}}`;
          return media ? `@media ${media}{${body}}` : body;
        })
        .join("\n");
      const html = VARIANTS.map(
        (variant) =>
          `<div id="${variant}" data-variant="${variant}" data-site-reveal="hidden">${variant}</div>`,
      ).join("");

      const browser = await chromium.launch();
      try {
        const page = await (
          await browser.newContext({ reducedMotion })
        ).newPage();
        await page.setContent(
          `<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`,
        );

        return await page.locator("[data-variant]").evaluateAll((nodes) =>
          nodes.map((node) => ({
            variant: node.id,
            opacity: getComputedStyle(node).opacity,
            transform: getComputedStyle(node).transform,
          })),
        );
      } finally {
        await browser.close();
      }
    }

    it("a hidden element waits out of sight, and shows at once under reduced motion", async () => {
      const waiting = await computed("no-preference");
      const lessMotion = await computed("reduce");

      expect(waiting.find(({ variant }) => variant === "up")?.opacity).toBe(
        "0",
      );
      expect(
        waiting.find(({ variant }) => variant === "grow-x")?.transform,
      ).not.toBe("none");

      for (const reveal of lessMotion) {
        expect(reveal.opacity, reveal.variant).toBe("1");
        expect(reveal.transform, reveal.variant).toBe("none");
      }
    }, 60_000);
  },
);

describe("the component after hydration", () => {
  let root: Root | null = null;
  let host: HTMLDivElement;
  let reduceMotion = false;
  let observed: { callback: IntersectionObserverCallback; target: Element }[] =
    [];

  beforeEach(() => {
    reduceMotion = false;
    observed = [];
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches:
            query.includes("prefers-reduced-motion: reduce") && reduceMotion,
          media: query,
        }) as MediaQueryList,
    );
    window.matchMedia = globalThis.matchMedia;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}

        observe(target: Element) {
          observed.push({ callback: this.callback, target });
        }

        disconnect() {}

        unobserve() {}
      },
    );
    vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => {
      run(0);
      return 0;
    });
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mount(top: number) {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top,
    } as DOMRect);
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(createElement(Reveal, { id: "alvo" }, "Conteúdo"));
    });

    return host.querySelector("#alvo")!;
  }

  it("leaves alone what is already on screen (hiding it would flash)", async () => {
    const element = await mount(100);

    expect(element.hasAttribute("data-site-reveal")).toBe(false);
  });

  it("hides what is below the fold and shows it when it scrolls in", async () => {
    const element = await mount(window.innerHeight * 2);
    expect(element.getAttribute("data-site-reveal")).toBe("hidden");

    await act(async () => {
      for (const { callback, target } of observed) {
        callback(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      }
    });

    expect(element.getAttribute("data-site-reveal")).toBe("shown");
  });

  it("without IntersectionObserver, never hides the section", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const element = await mount(window.innerHeight * 2);

    expect(element.hasAttribute("data-site-reveal")).toBe(false);
  });

  it("with reduced motion, never hides anything", async () => {
    reduceMotion = true;
    const element = await mount(window.innerHeight * 2);

    expect(element.hasAttribute("data-site-reveal")).toBe(false);
  });
});
