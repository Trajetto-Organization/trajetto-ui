import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";
import postcss, { type AtRule, type Declaration } from "postcss";

import { describe, expect, it } from "vitest";

import { Map as CoverageMap } from "@/components/contact-form/map";
import styles from "@/components/contact-form/map/coverage-map.module.css";

import { hasChromium } from "./helpers/measure-in-chromium";

/**
 * The motion of "Onde atendemos" on /contact (PUB-14 is a performance item).
 *
 * The illustration ran 54 animations that never stopped: a dash flow on each
 * of the 27 links and a glow on each of the 27 capitals. Chrome cannot hand
 * SVG children to the compositor, so the drawing was repainted every frame
 * for as long as it was on screen, and the animations had already started
 * while the map was still far below the fold. On a low-end phone that is
 * battery spent on a decoration.
 *
 * Now the motion plays once, when the map scrolls into view (the site
 * Reveal sets data-site-reveal="shown"), and the drawing then rests in its
 * final state.
 */

(globalThis as { React?: typeof React }).React = React;

const MODULE_CSS = path.join(
  process.cwd(),
  "src/components/contact-form/map/coverage-map.module.css",
);

const NO_PREFERENCE = "(prefers-reduced-motion: no-preference)";

/** The longest the whole sequence may take before the drawing is still. */
const MAX_MOTION_MS = 10_000;

interface AnimationDecl {
  selector: string;
  media: string | null;
  decl: Declaration;
}

function animationDeclarations(): AnimationDecl[] {
  const found: AnimationDecl[] = [];

  postcss
    .parse(readFileSync(MODULE_CSS, "utf8"))
    .walkDecls(/^animation(-name|-iteration-count)?$/, (decl) => {
      const rule = decl.parent as { selector?: string; parent?: unknown };
      let media: string | null = null;

      for (
        let node = rule.parent as AtRule | undefined;
        node;
        node = node.parent as AtRule | undefined
      ) {
        if (node.type === "atrule" && node.name === "media") {
          media = node.params.replace(/\s+/g, " ").trim();
        }
      }

      found.push({ selector: rule.selector ?? "", media, decl });
    });

  return found;
}

describe("the motion of the where-we-serve map, in the stylesheet", () => {
  const animations = animationDeclarations();

  it("has motion for whoever did not ask for reduced motion", () => {
    expect(animations.length).toBeGreaterThan(0);
  });

  it("only animates for whoever did not ask for reduced motion", () => {
    const outside = animations.filter((item) => item.media !== NO_PREFERENCE);

    expect(outside.map((item) => item.selector)).toEqual([]);
  });

  it('only starts when the map appears on screen (Reveal sets data-site-reveal="shown")', () => {
    const ungated = animations.filter(
      (item) =>
        !/^:global\(\[data-site-reveal="shown"\]\)\s/.test(item.selector),
    );

    expect(ungated.map((item) => item.selector)).toEqual([]);
  });

  it("has no endless animation", () => {
    const endless = animations.filter((item) =>
      /\binfinite\b/.test(item.decl.value),
    );

    expect(
      endless.map(
        (item) => `${item.selector} { ${item.decl.prop}: ${item.decl.value} }`,
      ),
    ).toEqual([]);
  });
});

/**
 * The module's CSS as the page would get it: each local class renamed the
 * way this runner renames it (the same names the markup carries) and
 * `:global(.x)` unwrapped.
 */
function compiledModuleCss(): string {
  const root = postcss.parse(readFileSync(MODULE_CSS, "utf8"));
  const names = styles as unknown as Record<string, string>;

  root.walkRules((rule) => {
    const parent = rule.parent as AtRule | undefined;
    if (parent?.type === "atrule" && /keyframes$/.test(parent.name)) return;

    rule.selector = rule.selector.replace(
      /:global\(([^)]+)\)|\.([A-Za-z_][\w-]*)/g,
      (_, global: string | undefined, local: string | undefined) =>
        global ?? `.${names[local!]}`,
    );
  });

  return root.toString();
}

interface Motion {
  revealFound: boolean;
  beforeReveal: number;
  afterReveal: number;
  longestEnd: number;
}

async function motionInChromium(
  reducedMotion: "reduce" | "no-preference",
): Promise<Motion> {
  const html = renderToStaticMarkup(createElement(CoverageMap));
  const css = compiledModuleCss();
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();

    await page.setContent(
      `<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`,
    );

    return await page.evaluate(async () => {
      const running = () => document.getAnimations().length;
      const beforeReveal = running();

      // The Reveal around the drawing (the facts have their own, "up").
      const reveal = document.querySelector('[data-variant="fade"]');
      reveal?.setAttribute("data-site-reveal", "shown");

      // Let the style change land before asking again.
      await new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      );

      const ends = document
        .getAnimations()
        .map((animation) =>
          Number(animation.effect?.getComputedTiming().endTime ?? 0),
        );

      return {
        revealFound: reveal !== null,
        beforeReveal,
        afterReveal: ends.length,
        longestEnd: ends.length ? Math.max(...ends) : 0,
      };
    });
  } finally {
    await browser.close();
  }
}

describe.skipIf(!hasChromium)(
  `the map's motion, in the browser${hasChromium ? "" : " — skipped: Chromium is not installed"}`,
  () => {
    it("stays still until it appears, animates once and stops", async () => {
      const motion = await motionInChromium("no-preference");

      // Red before: 55 animations were already running far below the fold.
      expect(motion.beforeReveal, "animações antes de aparecer").toBe(0);
      expect(motion.revealFound, "o mapa entra pelo Reveal").toBe(true);
      expect(motion.afterReveal).toBeGreaterThan(0);
      // Red before: Infinity.
      expect(motion.longestEnd).toBeLessThanOrEqual(MAX_MOTION_MS);
    }, 30_000);

    it("with reduced motion requested, animates nothing", async () => {
      const motion = await motionInChromium("reduce");

      expect(motion.afterReveal).toBe(0);
    }, 30_000);
  },
);
