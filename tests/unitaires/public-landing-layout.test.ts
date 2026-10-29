import { readFileSync } from "node:fs";
import path from "node:path";

import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { chromium, type Browser } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import loadConfig from "tailwindcss/loadConfig";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  BROWSER_STEP_TIMEOUT_MS,
  hasChromium,
} from "./helpers/measure-in-chromium";

import Home from "@/app/page";
import About from "@/app/sobre/page";
import FleetManagementPage from "@/app/gestao-de-frotas/page";
import DeliveryManagementPage from "@/app/gestao-de-entregas/page";
import DriverAppPage from "@/app/app-do-motorista/page";

import { SiteHeader } from "@/components/site/site-header";

import homeStyles from "@/components/site/home/home.module.css";
import productStyles from "@/components/site/product/product.module.css";

/**
 * The public pages from 320 to 1920 pixels, measured in Chromium.
 *
 * The pages are rendered as React renders them, with the Tailwind CSS their
 * classes generate and the CSS modules they import, and Chromium lays them
 * out at each width. Two things must hold everywhere: the page never
 * scrolls sideways, and no visible text ends up outside the screen. The
 * phone mockup also has to fit the app's screen across its frame (a short
 * phone crops the bottom, like the design; the sides never).
 *
 * The unit job in CI installs no browser, so the suite skips there and says
 * so in its title rather than passing without measuring.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string | { src: string };
    alt: string;
    className?: string;
  }) =>
    React.createElement("img", {
      src: typeof src === "string" ? src : src.src,
      alt,
      className,
      width: 32,
      height: 32,
    }),
}));

const WIDTHS = [320, 375, 414, 768, 1024, 1280, 1440, 1920] as const;

const PAGES = [
  ["/", Home],
  ["/sobre", About],
  ["/gestao-de-frotas", FleetManagementPage],
  ["/gestao-de-entregas", DeliveryManagementPage],
  ["/app-do-motorista", DriverAppPage],
] as const;

const ROOT = path.resolve(__dirname, "../..");

/**
 * A CSS module's source with its class names swapped for the ones this
 * runner generated, so the rendered markup and the rules match.
 */
function moduleCss(file: string, names: Record<string, string>): string {
  const source = readFileSync(path.resolve(ROOT, file), "utf8");

  return source.replace(/\.([a-zA-Z][\w-]*)/g, (whole, name: string) =>
    names[name] ? `.${names[name]}` : whole,
  );
}

/**
 * The phone mockup's own layout lives in globals.css (`.site-phone-*`: the
 * screen keeps its real size and scales down on very narrow phones). Only
 * those rules are taken: the rest of globals.css would clip the page
 * (`.site-root` has overflow-x: clip) and hide what this suite measures.
 */
function phoneLayoutCss(): string {
  const css = readFileSync(path.resolve(ROOT, "src/app/globals.css"), "utf8");
  const rules: string[] = [];

  postcss.parse(css).walkRules((rule) => {
    if (
      rule.parent?.type === "root" &&
      rule.selectors.every((selector) => selector.startsWith(".site-phone-"))
    ) {
      rules.push(rule.toString());
    }
  });

  return rules.join("\n");
}

const MODULE_CSS = [
  moduleCss(
    "src/components/site/home/home.module.css",
    homeStyles as Record<string, string>,
  ),
  moduleCss(
    "src/components/site/product/product.module.css",
    productStyles as Record<string, string>,
  ),
  phoneLayoutCss(),
].join("\n");

async function renderToMarkup(
  element: React.ReactElement,
): Promise<{ html: string; classes: string }> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(element);
  });

  const html = host.innerHTML;
  const classes = Array.from(host.querySelectorAll("[class]"))
    .map((node) => node.getAttribute("class"))
    .join(" ");

  await act(async () => root.unmount());
  host.remove();

  return { html, classes };
}

async function tailwindFor(classes: string): Promise<string> {
  const config = loadConfig(path.resolve(ROOT, "tailwind.config.ts"));

  const { css } = await postcss([
    tailwindcss({ ...config, content: [{ raw: classes, extension: "html" }] }),
  ]).process("@tailwind base; @tailwind components; @tailwind utilities;", {
    from: undefined,
  });

  return css;
}

interface Measurement {
  overflow: number;
  offscreenText: string[];
  overfullScreens: string[];
  phones: number;
}

/** Runs in the page. */
function measure(): Measurement {
  const viewport = document.documentElement.clientWidth;

  const clipsX = (style: CSSStyleDeclaration) =>
    style.overflowX === "hidden" || style.overflowX === "clip";
  const scrollsX = (style: CSSStyleDeclaration) =>
    style.overflowX === "auto" || style.overflowX === "scroll";

  const offscreenText: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const text = node.textContent?.trim();
    const parent = node.parentElement;
    if (!text || !parent || parent.closest("style, script, title")) continue;

    let left = -Infinity;
    let right = Infinity;
    let skip = false;

    for (
      let element: Element | null = parent;
      element;
      element = element.parentElement
    ) {
      const style = getComputedStyle(element);

      if (style.display === "none" || style.visibility === "hidden") {
        skip = true;
        break;
      }
      // Sideways scrolling inside a container is a design choice (tables,
      // the kanban board); the page itself is what must not scroll.
      if (scrollsX(style)) {
        skip = true;
        break;
      }
      if (clipsX(style)) {
        const box = element.getBoundingClientRect();
        left = Math.max(left, box.left);
        right = Math.min(right, box.right);
      }
    }
    if (skip) continue;

    const range = document.createRange();
    range.selectNodeContents(node);

    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width === 0 || rect.height === 0) continue;

      const visibleLeft = Math.max(rect.left, left);
      const visibleRight = Math.min(rect.right, right);
      if (visibleRight <= visibleLeft) continue; // entirely clipped away

      if (visibleLeft < -1 || visibleRight > viewport + 1) {
        offscreenText.push(
          `"${text.slice(0, 40)}" at ${Math.round(visibleLeft)}–${Math.round(visibleRight)}`,
        );
        break;
      }
    }
  }

  // The phone's screen must fit across its frame: a row cut at the side is a
  // broken picture of the app. (The bottom may crop on a short phone, as in
  // the design.)
  const overfullScreens = Array.from(
    document.querySelectorAll<HTMLElement>(".site-phone-viewport"),
  )
    .map((screen) => {
      const frame = screen.getBoundingClientRect();
      const boxes = Array.from(screen.querySelectorAll("*"))
        .map((child) => child.getBoundingClientRect())
        .filter(
          (box) => box.width > 0 && box.height > 0 && box.top < frame.bottom,
        );
      const excess = Math.max(
        0,
        ...boxes.map((box) =>
          Math.max(box.right - frame.right, frame.left - box.left),
        ),
      );

      return {
        label: screen.parentElement?.getAttribute("aria-label")?.slice(0, 48),
        excess: Math.round(excess),
      };
    })
    .filter(({ excess }) => excess > 1)
    .map(({ label, excess }) => `${label} +${excess}px`)
    .filter((value, index, all) => all.indexOf(value) === index);

  return {
    overflow: document.documentElement.scrollWidth - viewport,
    offscreenText: offscreenText.slice(0, 8),
    overfullScreens,
    phones: document.querySelectorAll(".site-phone-viewport").length,
  };
}

describe.skipIf(!hasChromium)(
  "the public pages from 320 to 1920 px (Chromium; skipped where no browser is installed)",
  () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await chromium.launch();
    }, 60_000);

    afterAll(async () => {
      await browser?.close();
    }, BROWSER_STEP_TIMEOUT_MS);

    it(
      "the measurement does see text pushed off the screen",
      async () => {
        // Guard against a measure that silently finds nothing.
        const page = await browser.newPage({
          viewport: { width: 320, height: 600 },
        });

        try {
          await page.setContent(
            '<!doctype html><html><body style="margin:0"><p style="margin-left:280px;white-space:nowrap">Texto fora da tela</p></body></html>',
          );
          const result = await page.evaluate(measure);

          expect(result.overflow).toBeGreaterThan(0);
          expect(result.offscreenText).toHaveLength(1);
        } finally {
          await page.close();
        }
      },
      BROWSER_STEP_TIMEOUT_MS,
    );

    it(
      "the site header fits its links, the Produtos menu and the buttons at every width",
      async () => {
        const { html, classes } = await renderToMarkup(
          React.createElement(SiteHeader),
        );
        const css = await tailwindFor(classes);
        const page = await browser.newPage({
          viewport: { width: 1440, height: 600 },
        });

        try {
          await page.setContent(
            `<!doctype html><html lang="pt-BR"><head><style>${css}</style></head><body>${html}</body></html>`,
          );

          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 600 });
            const result = await page.evaluate(measure);

            expect(
              result.overflow,
              `${width}px: horizontal scroll`,
            ).toBeLessThanOrEqual(0);
            expect(result.offscreenText, `${width}px: text off screen`).toEqual(
              [],
            );

            // From 960px the links sit in one row inside the floating bar
            // (12px offset + 58px tall).
            if (width >= 960) {
              const heights = await page.evaluate(() =>
                Array.from(
                  document.querySelectorAll("header nav a, header nav button"),
                ).map((element) => element.getBoundingClientRect().bottom),
              );
              expect(
                heights.length,
                `${width}px: desktop links`,
              ).toBeGreaterThan(3);
              expect(
                Math.max(...heights),
                `${width}px: links wrap below the bar`,
              ).toBeLessThanOrEqual(70);
            }
          }
        } finally {
          await page.close();
        }
      },
      BROWSER_STEP_TIMEOUT_MS,
    );

    it.each(PAGES)(
      "%s never scrolls sideways nor pushes text off the screen",
      async (route, Page) => {
        const { html, classes } = await renderToMarkup(
          React.createElement(Page),
        );
        const css = await tailwindFor(classes);

        const page = await browser.newPage({
          viewport: { width: 1440, height: 900 },
        });
        // The settled layout is what is measured: an element caught
        // mid-animation (a sheet sliding in) is not an overflow.
        await page.emulateMedia({ reducedMotion: "reduce" });

        try {
          await page.setContent(
            `<!doctype html><html lang="pt-BR"><head><style>${css}\n${MODULE_CSS}</style></head><body>${html}</body></html>`,
          );

          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 900 });
            const result = await page.evaluate(measure);

            expect(
              result.overflow,
              `${width}px: horizontal scroll`,
            ).toBeLessThanOrEqual(0);
            expect(result.offscreenText, `${width}px: text off screen`).toEqual(
              [],
            );
            expect(
              result.overfullScreens,
              `${width}px: phone screens that overflow`,
            ).toEqual([]);
            // The phone check measured something where the page draws one.
            if (route !== "/sobre")
              expect(
                result.phones,
                `${width}px: phones measured`,
              ).toBeGreaterThan(0);
          }
        } finally {
          await page.close();
        }
      },
      120_000,
    );
  },
);
