import { createElement } from "react";

import { describe, expect, it, vi } from "vitest";

import ContactPage from "@/app/contato/page";

import { hasChromium, measureInChromium } from "./helpers/measure-in-chromium";

// The navbar reads the session cookie on the server; it plays no part here.
vi.mock("@/components/site/site-header", () => ({ SiteHeader: () => null }));

/**
 * "Onde atendemos" on /contact, laid out (PUB-14).
 *
 * The three facts (Atendimento, Cobertura, Horário) once sat over the
 * drawing in an absolute block at the bottom of a fixed 400px box: on a
 * phone they covered the southern capitals (Porto Alegre's point landed on
 * the "Atendimento" heading), at 768px a wrapped fact left 7px, and with
 * larger text the block grew over the drawing.
 *
 * The redesign (Contato · Onde atendemos) puts the facts beside the drawing
 * on wide screens and above it on narrow ones, both in normal flow. So the
 * whole /contact page is rendered here and every mark of the drawing has to
 * keep clear of the facts' box, at every width and with enlarged text
 * (WCAG 1.4.4).
 */

vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

/** Room between any mark of the drawing and the facts' box. */
const MIN_CLEARANCE_PX = 12;

interface Layout {
  points: number;
  /** Smallest gap between a mark and the facts' box (negative: overlap). */
  clearance: number;
}

// Runs in the page: self-contained, no outer references.
function measureLayout(): Layout {
  const svg = document.querySelector(
    'svg[aria-labelledby="contact-coverage-title"]',
  )!;
  const section = svg.closest("section")!;
  const marks = [
    ...Array.from(svg.querySelectorAll("circle")).filter(
      (circle) => circle.getAttribute("fill") !== "none",
    ),
    ...Array.from(svg.querySelectorAll("text")),
  ].map((node) => node.getBoundingClientRect());
  const facts = section.querySelector("dl")!.getBoundingClientRect();

  // Distance between two boxes along the axis where they are apart.
  const gap = (box: DOMRect) =>
    Math.max(
      facts.left - box.right,
      box.left - facts.right,
      facts.top - box.bottom,
      box.top - facts.bottom,
    );

  return { points: marks.length, clearance: Math.min(...marks.map(gap)) };
}

// The same, after the reader doubles the text size (rem-based type and
// spacing grow; the drawing does not).
function measureLayoutWithLargeText(): Layout {
  document.documentElement.style.fontSize = "32px";

  const svg = document.querySelector(
    'svg[aria-labelledby="contact-coverage-title"]',
  )!;
  const section = svg.closest("section")!;
  const marks = [
    ...Array.from(svg.querySelectorAll("circle")).filter(
      (circle) => circle.getAttribute("fill") !== "none",
    ),
    ...Array.from(svg.querySelectorAll("text")),
  ].map((node) => node.getBoundingClientRect());
  const facts = section.querySelector("dl")!.getBoundingClientRect();

  const gap = (box: DOMRect) =>
    Math.max(
      facts.left - box.right,
      box.left - facts.right,
      facts.top - box.bottom,
      box.top - facts.bottom,
    );

  return { points: marks.length, clearance: Math.min(...marks.map(gap)) };
}

describe.skipIf(!hasChromium)(
  `the "where we serve" map on the /contato page${hasChromium ? "" : " — skipped: Chromium is not installed"}`,
  () => {
    it.each([
      ["phone", 375, 812, measureLayout],
      ["tablet", 768, 1024, measureLayout],
      ["laptop", 1024, 768, measureLayout],
      ["desktop", 1280, 800, measureLayout],
      ["tablet with doubled text", 768, 1024, measureLayoutWithLargeText],
      ["desktop with doubled text", 1280, 800, measureLayoutWithLargeText],
    ])(
      "on %s (%ipx), no dot sits under the details",
      async (_, width, height, measure) => {
        const layout = await measureInChromium(
          createElement(ContactPage),
          measure,
          {
            width,
            height,
          },
        );

        // 27 capitals, the centre, its ping and the "Trajetto" label.
        expect(layout.points).toBe(30);
        expect(
          layout.clearance,
          `menor distância entre um ponto e as informações: ${layout.clearance}px`,
        ).toBeGreaterThanOrEqual(MIN_CLEARANCE_PX);
      },
      60_000,
    );
  },
);
