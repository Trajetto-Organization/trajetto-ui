import * as React from "react";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { existsSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import loadConfig from "tailwindcss/loadConfig";

/**
 * Renders a component and asks a real browser what it looks like.
 *
 * Some rules only exist in the cascade — a margin that preflight resets, a
 * height a parent imposes on its buttons — and happy-dom cannot answer for
 * them: it does not match `:where()` around a combinator at all, and has no
 * layout. So the component is rendered here (its real markup), Tailwind
 * generates the CSS it would ship for that markup (preflight on, this
 * repository's config) and Chromium resolves the cascade and the layout.
 *
 * The unit job in CI installs no browser; callers skip with
 * `describe.skipIf(!hasChromium)` and say so in the suite title, rather than
 * passing without measuring.
 */

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React ??= React;

const hasChromium = ((): boolean => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

/**
 * Time allowed for any test step that drives Chromium: launching it, building
 * the Tailwind CSS for the markup, working a page, closing it.
 *
 * Vitest's defaults (5 s per test, 10 s per hook) are sized for pure logic.
 * Alone, a launch-measure-close takes about half a second; in the full unit
 * run every worker is busy at once, and a cold launch or a `browser.close()`
 * has been measured past those defaults (chat-jump-layout cut at 5 s per test,
 * chat-audio-smoke's teardown cut at 10 s) while passing in two seconds on its
 * own. A browser step therefore gets this budget explicitly, as every other
 * suite here that launches Chromium already did. It is a ceiling, not a wait:
 * a healthy run finishes exactly as fast as before.
 */
const BROWSER_STEP_TIMEOUT_MS = 60_000;

interface Rendered {
  html: string;

  /**
   * Every class on the page, unescaped. Tailwind scans text for candidates,
   * and serialised HTML turns an arbitrary variant's `&` into `&amp;`.
   */
  classes: string;
}

async function renderToMarkup(element: ReactElement): Promise<Rendered> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(element);
  });

  // Portals (dialogs) render beside the host, so the whole body is taken.
  const html = document.body.innerHTML;
  const classes = Array.from(document.querySelectorAll("[class]"))
    .map((node) => node.getAttribute("class"))
    .join(" ");

  await act(async () => root.unmount());
  document.body.innerHTML = "";

  return { html, classes };
}

async function tailwindFor(classes: string): Promise<string> {
  const config = loadConfig(
    path.resolve(__dirname, "../../../tailwind.config.ts"),
  );

  const { css } = await postcss([
    tailwindcss({ ...config, content: [{ raw: classes, extension: "html" }] }),
  ]).process("@tailwind base; @tailwind components; @tailwind utilities;", {
    from: undefined,
  });

  return css;
}

/**
 * Renders `element`, loads it with its Tailwind CSS into Chromium at `width`
 * and returns what `measure` computes there. `measure` runs IN the page, so
 * it can only use what it is given and the page's own globals.
 */
async function measureInChromium<T>(
  element: ReactElement,
  measure: () => T,
  { width = 1024, height = 768 }: { width?: number; height?: number } = {},
): Promise<T> {
  const { html, classes } = await renderToMarkup(element);
  const css = await tailwindFor(classes);

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width, height } });

    await page.setContent(
      `<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`,
    );

    return (await page.evaluate(measure)) as T;
  } finally {
    await browser.close();
  }
}

export { BROWSER_STEP_TIMEOUT_MS, hasChromium, measureInChromium };
