import * as React from "react";
import { act, createElement } from "react";
import { flushSync } from "react-dom";
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

describe("the stagger delay applies only in the shown state", () => {
  // The delay used to be an inline transition-delay, on the element at all
  // times. Hydration marks a below-the-fold element hidden, and with no
  // duration (0s) plus that delay the browser still creates a transition: the
  // element stayed visible for the delay (80-740 ms) and then vanished at
  // once, and Lighthouse counted each one as a non-composited animation. The
  // delay now travels as --site-reveal-delay and only the shown rules read it.
  const rules = revealRules();

  it("the server HTML carries the delay as a custom property, not an inline transition-delay", () => {
    const html = renderToStaticMarkup(
      createElement(Reveal, { delay: 150 }, "Conteúdo"),
    );

    expect(html).not.toMatch(/transition-delay/);
    expect(html).toContain("--site-reveal-delay:150ms");
  });

  it("without a delay, writes none", () => {
    expect(
      renderToStaticMarkup(createElement(Reveal, null, "Conteúdo")),
    ).not.toMatch(/delay/);
  });

  it("both shown rules apply var(--site-reveal-delay) after the transition shorthand (which resets it)", () => {
    const shown = rules.filter(
      ({ selector, decls }) =>
        selector.includes('[data-site-reveal="shown"]') &&
        "transition" in decls,
    );

    expect(shown.map(({ selector }) => selector)).toEqual(
      expect.arrayContaining([
        '[data-site-reveal="shown"]',
        '[data-site-reveal="shown"][data-variant^="grow"]',
      ]),
    );
    for (const { selector, decls } of shown) {
      const props = Object.keys(decls);

      expect(decls["transition-delay"], selector).toMatch(
        /^var\(--site-reveal-delay\b/,
      );
      expect(props.indexOf("transition-delay"), selector).toBeGreaterThan(
        props.indexOf("transition"),
      );
    }
  });

  it("no rule outside the shown state sets a transition or its delay", () => {
    expect(
      rules
        .filter(
          ({ selector, decls }) =>
            !selector.includes('[data-site-reveal="shown"]') &&
            ("transition" in decls || "transition-delay" in decls),
        )
        .map(({ selector }) => selector),
    ).toEqual([]);
  });
});

describe.skipIf(!hasChromium)(
  `the reveal's CSS in a browser${hasChromium ? "" : " — skipped: Chromium is not installed"}`,
  () => {
    // Only the reveal's own rules: the page around it is not under test.
    function revealCss(): string {
      return revealRules()
        .map(({ selector, media, decls }) => {
          const body = `${selector}{${Object.entries(decls)
            .map(([prop, value]) => `${prop}:${value}`)
            .join(";")}}`;
          return media ? `@media ${media}{${body}}` : body;
        })
        .join("\n");
    }

    async function computed(reducedMotion: "reduce" | "no-preference") {
      const css = revealCss();
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

    // See "the stagger delay applies only in the shown state": a delay on the
    // hidden state made a 0s transition that hid the element late, and a
    // custom property (unlike transition-delay) is inherited by nested reveals.
    it("the stagger delay is 0s while hidden, the element's own once shown, and never inherited", async () => {
      // The component's real markup: a delayed rise, a delayed bar, and a
      // reveal with no delay inside a delayed one.
      const html = renderToStaticMarkup(
        createElement(
          "div",
          null,
          createElement(Reveal, { id: "up", delay: 150 }, "up"),
          createElement(Reveal, { id: "bar", variant: "grow-y", delay: 320 }),
          createElement(
            Reveal,
            { id: "outer", delay: 200 },
            createElement(Reveal, { id: "inner" }, "inner"),
          ),
        ),
      );

      const browser = await chromium.launch();
      try {
        const page = await browser.newPage();
        await page.setContent(
          `<!doctype html><html><head><style>${revealCss()}</style></head><body>${html}</body></html>`,
        );
        const delays = (state: "hidden" | "shown") =>
          page.evaluate((state) => {
            const nodes = [
              ...document.querySelectorAll<HTMLElement>("[data-variant]"),
            ];
            for (const node of nodes)
              node.setAttribute("data-site-reveal", state);

            return Object.fromEntries(
              nodes.map((node) => [
                node.id,
                getComputedStyle(node).transitionDelay,
              ]),
            );
          }, state);

        expect(await delays("hidden")).toEqual({
          up: "0s",
          bar: "0s",
          outer: "0s",
          inner: "0s",
        });
        expect(await delays("shown")).toEqual({
          up: "0.15s",
          bar: "0.32s",
          outer: "0.2s",
          inner: "0s",
        });
      } finally {
        await browser.close();
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

  async function mount(top: number, props: { delay?: number } = {}) {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top,
    } as DOMRect);
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(createElement(Reveal, { id: "alvo", ...props }, "Conteúdo"));
    });

    return host.querySelector<HTMLElement>("#alvo")!;
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

  // An inline transition-delay on the hidden state made a 0s transition that
  // hid the element only after the delay (see "the stagger delay applies only
  // in the shown state"); the delay waits in a custom property instead.
  it("hides a delayed element with no transition-delay; the custom property carries the delay", async () => {
    const element = await mount(window.innerHeight * 2, { delay: 150 });

    expect(element.getAttribute("data-site-reveal")).toBe("hidden");
    expect(element.style.transitionDelay).toBe("");
    expect(element.style.getPropertyValue("--site-reveal-delay")).toBe("150ms");
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

  describe("one hydration measures every element before writing to any", () => {
    // Each Reveal and CountUp used to measure itself (getBoundingClientRect)
    // and write right away (the hidden attribute, the count's zero) in its own
    // layout effect, so the next one's measurement forced a fresh layout: 61
    // forced style/layout recalculations while the home page hydrated, ~18 ms
    // on a fast desktop and 50-70 ms on a mid-range Android. The reads now
    // happen together and the writes after them, in one flush per commit that
    // still runs before the browser paints.

    /** Every element below the fold; records what was already written at each read. */
    function measureBelowFold(): string[] {
      const seen: string[] = [];

      vi.spyOn(
        HTMLElement.prototype,
        "getBoundingClientRect",
      ).mockImplementation(() => {
        const hidden = host.querySelectorAll(
          '[data-site-reveal="hidden"]',
        ).length;
        const zeroed = [...host.querySelectorAll(".count")].filter(
          (count) => count.textContent === "0",
        ).length;
        seen.push(`${hidden} hidden, ${zeroed} zeroed`);

        return { top: window.innerHeight * 2 } as DOMRect;
      });

      return seen;
    }

    function createHost(): Root {
      host = document.createElement("div");
      document.body.appendChild(host);
      root = createRoot(host);

      return root;
    }

    /** Reveals and counts interleaved, as on the home page. */
    function section() {
      return createElement(
        "div",
        null,
        createElement(Reveal, { id: "r1" }, "Primeiro"),
        createElement(CountUp, { value: 127, className: "count" }),
        createElement(Reveal, { id: "r2", variant: "grow-y" }),
        createElement(CountUp, { value: 48, className: "count" }),
        createElement(Reveal, { id: "r3" }, "Terceiro"),
      );
    }

    function written() {
      return {
        hidden: [...host.querySelectorAll('[data-site-reveal="hidden"]')].map(
          (element) => element.id,
        ),
        counts: [...host.querySelectorAll(".count")].map(
          (count) => count.textContent,
        ),
      };
    }

    /** Renders outside act, so React's real scheduling decides what has run. */
    async function withoutAct(run: () => Promise<void>) {
      const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

      env.IS_REACT_ACT_ENVIRONMENT = false;
      try {
        await run();
      } finally {
        env.IS_REACT_ACT_ENVIRONMENT = true;
      }
    }

    it("reads the position of every reveal and count before the first write", async () => {
      const seen = measureBelowFold();
      const app = createHost();

      await act(async () => {
        app.render(section());
      });

      expect(seen).toEqual(Array(5).fill("0 hidden, 0 zeroed"));
      expect(written()).toEqual({
        hidden: ["r1", "r2", "r3"],
        counts: ["0", "0"],
      });
    });

    // The flush is a microtask: it runs after React's commit and before the
    // browser's next chance to paint, which only comes after the task. A
    // count's zero is React state, so it has to commit inside that flush too,
    // or the final number would show for a frame and then drop to zero.
    it("hides and zeroes before the task ends, so nothing flashes on the first paint", async () => {
      measureBelowFold();

      await withoutAct(async () => {
        const app = createHost();

        flushSync(() => app.render(section()));
        // Microtasks only: no task boundary, so no paint, in between.
        await Promise.resolve();

        expect(written()).toEqual({
          hidden: ["r1", "r2", "r3"],
          counts: ["0", "0"],
        });
      });
    });

    // StrictMode's double effect, a re-render that drops a Reveal or a quick
    // navigation run the cleanup before the flush: what left must not be
    // measured, hidden or observed afterwards.
    it("forgets an element whose effect was cleaned up before the flush", async () => {
      const seen = measureBelowFold();

      await withoutAct(async () => {
        const app = createHost();

        flushSync(() =>
          app.render(
            createElement(
              "div",
              null,
              createElement(Reveal, { id: "fica" }, "Fica"),
              createElement(Reveal, { id: "sai" }, "Sai"),
            ),
          ),
        );
        const leaving = host.querySelector<HTMLElement>("#sai")!;
        flushSync(() =>
          app.render(
            createElement(
              "div",
              null,
              createElement(Reveal, { id: "fica" }, "Fica"),
            ),
          ),
        );
        await Promise.resolve();

        expect(seen).toHaveLength(1);
        expect(leaving.hasAttribute("data-site-reveal")).toBe(false);
        expect(observed.map(({ target }) => target.id)).toEqual(["fica"]);
        expect(written().hidden).toEqual(["fica"]);
      });
    });

    it("a count below the fold still counts up to its value when it scrolls in", async () => {
      measureBelowFold();
      // One frame that already lands past the duration: the final value.
      vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => {
        run(performance.now() + 5_000);
        return 1;
      });
      const app = createHost();

      await act(async () => {
        app.render(createElement(CountUp, { value: 127, className: "count" }));
      });
      expect(written().counts).toEqual(["0"]);

      await act(async () => {
        for (const { callback, target } of observed) {
          callback(
            [{ isIntersecting: true, target } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
        }
      });

      expect(written().counts).toEqual(["127"]);
    });

    it.each([
      ["already on screen", () => {}],
      ["under reduced motion", () => (reduceMotion = true)],
    ])("a count %s keeps its final value", async (_, arrange) => {
      arrange();
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        top: reduceMotion ? window.innerHeight * 2 : 100,
      } as DOMRect);
      const app = createHost();

      await act(async () => {
        app.render(createElement(CountUp, { value: 127, className: "count" }));
      });

      expect(written().counts).toEqual(["127"]);
      expect(observed).toEqual([]);
    });
  });
});
