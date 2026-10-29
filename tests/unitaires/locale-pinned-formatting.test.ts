import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Numbers and dates on screen are formatted in pt-BR, always.
 *
 * `50110.toLocaleString()` follows whatever locale the machine has: the
 * server rendered "50.110 km" (pt-BR) and a browser in English hydrated
 * "50,110 km" — which a Brazilian reads as fifty kilometres. React reported
 * the mismatch on the checklist table (found by tests/ui/journey-fleet.spec.ts,
 * whose Chromium runs en-US); the same call sat in the fuel and checklist
 * detail dialogs and forms. A call without a locale is a call that depends on
 * the machine, so none may exist.
 */
const SOURCE = resolve(__dirname, "../../src");

// No `g` flag: `test` on a global regex keeps `lastIndex` between lines.
const LOCALE_LESS = /\.toLocale(?:Date|Time)?String\(\s*\)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);

    return /\.(tsx?|jsx?)$/.test(entry.name) ? [path] : [];
  });
}

describe("number and date formatting on screen", () => {
  it("no toLocale*String() call without the locale", () => {
    const offenders = sourceFiles(SOURCE).flatMap((file) => {
      const text = readFileSync(file, "utf8");

      return text
        .split("\n")
        .map((line, index) => ({ line, index }))
        .filter(
          ({ line }) => LOCALE_LESS.test(line) && !line.trim().startsWith("//"),
        )
        .map(({ index }) => `${relative(SOURCE, file)}:${index + 1}`);
    });

    expect(offenders).toEqual([]);
  });
});
