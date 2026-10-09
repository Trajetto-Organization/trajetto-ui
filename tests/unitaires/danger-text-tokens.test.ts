import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Error and danger text speaks through the `destructive` token (visual QA,
 * wave 4). The token is measured for contrast in both themes (globals.css);
 * the raw shades it replaced were picked by eye: `text-red-500` on a white
 * card is 3.76:1, under the 4.5:1 floor, and was the colour of several form
 * errors and required hints. Status colours, borders of invalid fields, the
 * required asterisk (decision 3.3) and the marketing pages are not in scope.
 */
const SRC = resolve(__dirname, "../../src");
// Marketing illustrations: decorative mock screens, not product UI.
const DECORATIVE = /^components\/(home|marketing)\//;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);

    return statSync(full).isDirectory()
      ? walk(full)
      : entry.endsWith(".tsx")
        ? [full]
        : [];
  });

const files = walk(SRC)
  .map((file) => ({
    path: relative(SRC, file).split("\\").join("/"),
    source: readFileSync(file, "utf8"),
  }))
  .filter((file) => !DECORATIVE.test(file.path));

describe("danger and error text uses the destructive token", () => {
  it("no light-theme text in red-400/500 (under AA on a white card)", () => {
    const offenders = files.flatMap(({ path, source }) =>
      source
        .split("\n")
        .map((line, index) => ({ line, at: `${path}:${index + 1}` }))
        .filter(({ line }) => /(^|["'`\s])text-red-(400|500)\b/.test(line))
        .map(({ at }) => at),
    );

    expect(offenders).toEqual([]);
  });

  it("no dialog title painted with a raw red", () => {
    const offenders = files.flatMap(({ path, source }) =>
      [...source.matchAll(/<(?:Alert)?DialogTitle\b[^>]*>/g)]
        .filter((match) => /\bred-\d{3}\b/.test(match[0]))
        .map(() => path),
    );

    expect(offenders).toEqual([]);
  });

  it("the occurrence form builder's errors read in the token", () => {
    const builder = files.find(
      (file) =>
        file.path ===
        "features/deliveries/occurrence-types/form-builder/index.tsx",
    );

    expect(builder?.source).toBeDefined();
    expect(builder!.source).not.toMatch(/text-red-\d{3}/);
    expect(builder!.source).toMatch(/text-destructive/);
  });
});
