import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The colour tokens, held to the contrast floor they are used at.
 *
 * axe catches this on a running page, but only where the combination happens
 * to be on screen: the destructive badge failed for months and was found the
 * day a test left a revoked API key in the fixture. A token is used in dozens
 * of places nobody screenshots, so the value itself is worth checking.
 *
 * 4.5:1 is the WCAG AA floor for normal text. Both of the pairs below are
 * normal text — a badge's label and a sentence — so neither gets the 3:1 that
 * large text is allowed.
 *
 * Measured from `globals.css` rather than from a copy kept here: a duplicated
 * palette is a palette that drifts, and this file exists precisely to catch
 * drift.
 */
const CSS = readFileSync(
  resolve(__dirname, "../../src/app/globals.css"),
  "utf8",
);

/** `--name: H S% L%;` inside `:root` (light) or `.dark`. */
function token(name: string, theme: "light" | "dark"): [number, number, number] {
  const blockStart =
    theme === "light" ? CSS.indexOf(":root") : CSS.indexOf(".dark");

  expect(blockStart, `bloco ${theme} não encontrado`).toBeGreaterThan(-1);

  const block = CSS.slice(blockStart, CSS.indexOf("}", blockStart));

  const match = new RegExp(
    `--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`,
  ).exec(block);

  expect(match, `--${name} não está no tema ${theme}`).not.toBeNull();

  return [Number(match![1]), Number(match![2]), Number(match![3])];
}

/** HSL to sRGB, the same conversion a browser does for `hsl()`. */
function toRgb([h, s, l]: [number, number, number]): [number, number, number] {
  const saturation = s / 100;
  const lightness = l / 100;

  const a = saturation * Math.min(lightness, 1 - lightness);

  const channel = (n: number): number => {
    const k = (n + h / 30) % 12;

    return lightness - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };

  return [
    Math.round(channel(0) * 255),
    Math.round(channel(8) * 255),
    Math.round(channel(4) * 255),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const linear = [r, g, b].map((value) => {
    const channel = value / 255;

    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(
  first: [number, number, number],
  second: [number, number, number],
): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);

  const [lighter, darker] = a > b ? [a, b] : [b, a];

  return (lighter + 0.05) / (darker + 0.05);
}

const ratioOf = (
  foreground: string,
  background: string,
  theme: "light" | "dark",
): number =>
  contrast(toRgb(token(foreground, theme)), toRgb(token(background, theme)));

const AA_NORMAL_TEXT = 4.5;

describe("the maths itself", () => {
  it("agrees with the known extremes", () => {
    /**
     * A guard, and not a formality: every assertion below depends on this
     * conversion, and a broken one would report comfortable numbers for
     * anything. Black on white is 21:1 by definition, and a colour against
     * itself is 1:1.
     */
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
    expect(contrast([120, 45, 200], [120, 45, 200])).toBeCloseTo(1, 5);
  });

  it("reads a token out of the stylesheet", () => {
    // If the parser silently returned a default, every ratio below would be
    // measuring the same two colours.
    expect(token("background", "light")).not.toEqual(
      token("background", "dark"),
    );
  });
});

describe("text on a coloured surface", () => {
  /**
   * `destructive` is the pair this file was written for. It was
   * `0 84.2% 60.2%` — 3.60:1 behind white text — so the badge that says
   * "Revogada" and every destructive button were below the floor, on exactly
   * the controls a person is supposed to read carefully before clicking.
   */
  it.each([
    ["destructive-foreground", "destructive"],
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["muted-foreground", "muted"],
    ["accent-foreground", "accent"],
    ["card-foreground", "card"],
    ["popover-foreground", "popover"],
    ["foreground", "background"],
  ] as const)("%s on %s clears AA in both themes", (foreground, background) => {
    for (const theme of ["light", "dark"] as const) {
      expect(
        ratioOf(foreground, background, theme),
        `${foreground} sobre ${background} no tema ${theme}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });
});

describe("coloured text on the page", () => {
  it("destructive text is readable on a card", () => {
    // `text-destructive` on a white card is the other half of the same token,
    // and it was 3.76:1.
    for (const theme of ["light", "dark"] as const) {
      expect(
        ratioOf("destructive", "card", theme),
        `texto destrutivo no tema ${theme}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });
});
