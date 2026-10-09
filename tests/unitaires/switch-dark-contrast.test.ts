import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * An unchecked switch has to be visible in the dark theme (visual sweep,
 * wave 4b; WCAG 1.4.11, 3:1 for a control's state).
 *
 * The track was `bg-input`, which in `.dark` is the card's own shade
 * (1.2:1), and the thumb `bg-background`, darker still: the "Exigir foto" and
 * "Ocorrência impeditiva" toggles of the occurrence-type dialog were black on
 * black. Measured from the real files, not from a copy of the palette.
 */
const CSS = readFileSync(
  resolve(__dirname, "../../src/app/globals.css"),
  "utf8",
);
const SWITCH = readFileSync(
  resolve(__dirname, "../../src/components/ui/switch.tsx"),
  "utf8",
);

// Tailwind's default palette (the config does not override it).
const PALETTE: Record<string, [number, number, number]> = {
  "slate-400": [148, 163, 184],
  "slate-500": [100, 116, 139],
  "slate-600": [71, 85, 105],
};

function darkToken(name: string): [number, number, number] {
  const start = CSS.indexOf(".dark");
  const block = CSS.slice(start, CSS.indexOf("}", start));
  const match = new RegExp(
    `--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`,
  ).exec(block);

  expect(match, `--${name} não está no tema escuro`).not.toBeNull();

  const [h, s, l] = [
    Number(match![1]),
    Number(match![2]) / 100,
    Number(match![3]) / 100,
  ];
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;

    return Math.round(
      (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) * 255,
    );
  };

  return [channel(0), channel(8), channel(4)];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (hi + 0.05) / (lo + 0.05);
}

describe("Switch in the dark theme", () => {
  const darkUnchecked = /dark:data-\[state=unchecked\]:bg-(slate-\d{3})/.exec(
    SWITCH,
  );

  it("the off track has its own colour in dark, not --input's", () => {
    expect(
      darkUnchecked,
      "sem classe dark:data-[state=unchecked]:bg-*",
    ).not.toBeNull();
  });

  it("the off track contrasts 3:1 with the card, the page and the thumb", () => {
    const track = PALETTE[darkUnchecked![1]];

    expect(
      track,
      `cor ${darkUnchecked![1]} fora da tabela do teste`,
    ).toBeDefined();
    expect(contrast(track, darkToken("card"))).toBeGreaterThanOrEqual(3);
    // The page AND the thumb: the thumb is bg-background, riding on the track.
    expect(contrast(track, darkToken("background"))).toBeGreaterThanOrEqual(3);
  });

  it("dark --input, which was the track, really did not reach 3:1 with the card", () => {
    expect(contrast(darkToken("input"), darkToken("card"))).toBeLessThan(3);
  });
});
