import { describe, expect, it } from "vitest";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

/**
 * No fixed dark-gray text in the signed-in app without a dark-theme answer.
 *
 * The visual sweep (wave 4b) found "Meus Veículos" in the dark theme with the
 * brand, plate and mileage in `text-gray-900` on the dark card: black on
 * navy, unreadable. The same hard-coded palette was in the driver's fuel and
 * service-order lists, the checklist review step, the avatar upload and the
 * notification list. Text takes the theme tokens (`text-foreground`,
 * `text-muted-foreground`), which both themes define.
 *
 * Allowed: a self-contained chip that sets its own light background on the
 * same line (`bg-gray-100 text-gray-800`) — it reads the same in both themes —
 * and any line that already carries a `dark:` variant.
 */
const SRC = resolve(__dirname, "../../src");

const ROOTS = [
  "app/(protected)",
  "features",
  "components/shared",
  "components/ui",
];

const FIXED_TEXT =
  /\btext-(gray|neutral|zinc|slate|stone)-(400|500|600|700|800|900)\b/;
const CHIP_BACKGROUND = /\bbg-[a-z]+-(50|100|200)\b/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return files(path);

    return /\.tsx$/.test(name) ? [path] : [];
  });
}

describe("fixed-colour text in the dark theme", () => {
  it("no authenticated screen uses a fixed dark grey without a dark: variant", () => {
    const offenders: string[] = [];

    for (const root of ROOTS) {
      for (const file of files(join(SRC, root))) {
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, index) => {
            if (!FIXED_TEXT.test(line)) return;
            if (line.includes("dark:")) return;
            if (CHIP_BACKGROUND.test(line)) return;

            offenders.push(
              `${relative(SRC, file)}:${index + 1}: ${line.trim()}`,
            );
          });
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * The ⌘K palette was a fixed `bg-white` panel with `text-black` search and
   * near-white item names in the dark theme (review of wave 4b). The line
   * scan above missed it: classNames span several lines. This reads each
   * string literal whole and wants a `dark:` answer in the same literal.
   *
   * Allowed: frames that sit behind a photo or signature and must stay white
   * to show it as captured, and the map pin's white dot.
   */
  it("no fixed white background or black text without a dark: variant", () => {
    const FIXED_LIGHT = /(^|[\s"'`])(bg-white|text-black)(?=[\s"'`]|$)/;
    const LITERAL = /"[^"\n]*(?:\n[^"\n]*)*?"|`[^`]*`/g;
    const ALLOWED = [
      // White behind captured images.
      "features/deliveries/occurrence-authorizations/queue.tsx",
      "features/deliveries/occurrences/photos-cell.tsx",
      "features/deliveries/proof-audits/panel.tsx",
      // The pin's dot on the map tiles, the same in both themes.
      "app/(protected)/_components/shared/custom/location-picker/ping-effect/index.tsx",
    ].map((path) => path.split("/").join(sep));

    const offenders: string[] = [];

    for (const root of ROOTS) {
      for (const file of files(join(SRC, root))) {
        const path = relative(SRC, file);

        if (ALLOWED.includes(path)) continue;

        const source = readFileSync(file, "utf8");

        for (const match of source.matchAll(LITERAL)) {
          const literal = match[0];

          if (!FIXED_LIGHT.test(literal)) continue;
          if (literal.includes("dark:")) continue;

          const line = source.slice(0, match.index).split("\n").length;

          offenders.push(`${path}:${line}: ${literal.replace(/\s+/g, " ")}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * With the theme switch in the header (package app-theme), the dark theme
   * is one click away for everybody. These shades read on white but sit
   * under 4.5:1 on the dark card (`--card` 220 36% 14%): red-600 3.41,
   * blue-600 3.18, yellow-700 3.34, emerald-600 4.36. Text in them needs its
   * `dark:` answer (the -400 shade clears 5.9:1). Icons (a literal sized with
   * `h-*`/`size-*`) need only 3:1 and are left alone, and so is a chip that
   * brings its own light background.
   */
  it("no low-contrast text on the dark card without a dark: variant", () => {
    const LOW_ON_DARK =
      /(^|[\s"'`])text-(red-600|blue-600|yellow-700|emerald-600)(?=[\s"'`]|$)/;
    const ICON = /(^|\s)(h-[0-9.]+|size-[0-9.]+)(\s|$)/;
    const LITERAL = /"[^"\n]*(?:\n[^"\n]*)*?"|`[^`]*`/g;

    const offenders: string[] = [];

    for (const root of ROOTS) {
      for (const file of files(join(SRC, root))) {
        const source = readFileSync(file, "utf8");

        for (const match of source.matchAll(LITERAL)) {
          const literal = match[0];

          if (!LOW_ON_DARK.test(literal)) continue;
          if (literal.includes("dark:")) continue;
          if (
            CHIP_BACKGROUND.test(literal) ||
            /\bbg-[a-z]+-300\b/.test(literal)
          )
            continue;
          if (ICON.test(literal.slice(1, -1))) continue;

          const line = source.slice(0, match.index).split("\n").length;

          offenders.push(
            `${relative(SRC, file)}:${line}: ${literal.replace(/\s+/g, " ")}`,
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
