import { describe, expect, it } from "vitest";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

/**
 * One destructive button, everywhere.
 *
 * The app had three: solid hardcoded red (`bg-red-600 text-white`), a soft
 * red tint (`bg-red-600/10 text-red-600`) and the `destructive` variant. The
 * same verb looked different per screen, and the soft tint is also below the
 * AA floor in the light theme (red-600 on its own 10% tint is ~4.0:1). The
 * `destructive` variant is the one whose token `color-contrast.test.ts`
 * already holds to 4.5:1 in both themes, so that is the standard.
 */
const SRC = resolve(__dirname, "../../src");

/**
 * Not confirmation actions: the photo-upload chips are icon-only "remove
 * this file" badges.
 */
const EXEMPT = [
  "features/vehicle-checklist/create-form/photo-upload.tsx",
  "features/vehicle-checklist/update-form/photo-upload.tsx",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);

    if (statSync(full).isDirectory()) return sourceFiles(full);

    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

const files = sourceFiles(SRC)
  .map((file) => ({
    path: relative(SRC, file).replace(/\\/g, "/"),
    text: readFileSync(file, "utf8"),
  }))
  .filter(({ path }) => !EXEMPT.some((prefix) => path.startsWith(prefix)));

/**
 * The className source of every Button / AlertDialogAction in a file.
 *
 * Parsed with the TypeScript compiler instead of a regex: a `[^>]*` scan
 * stops at the `>` of `onClick={() => ...}` and never sees the classes that
 * follow it, which is how a hardcoded red trigger slipped through before.
 */
function actionClassNames(path: string, text: string): string[] {
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);

      if (tag === "Button" || tag === "AlertDialogAction") {
        for (const attr of node.attributes.properties) {
          if (
            ts.isJsxAttribute(attr) &&
            attr.name.getText(source) === "className" &&
            attr.initializer
          ) {
            found.push(attr.initializer.getText(source));
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return found;
}

/** Any raw red utility (bg/text, with or without hover:/dark: prefixes). */
const RAW_RED = /(?:^|[\s"'`{(])(?:[a-z-]+:)*(?:bg|text)-red-\d{2,3}/;

describe("destructive action style", () => {
  it("no button paints red by hand (background or text)", () => {
    const offenders = files.flatMap(({ path, text }) =>
      actionClassNames(path, text)
        .filter((className) => RAW_RED.test(className))
        .map((className) => `${path}: ${className}`),
    );

    expect(offenders).toEqual([]);
  });

  it("no loose class recreates the solid red button", () => {
    const offenders = files
      .filter(({ text }) =>
        /bg-red-600[^"`]*text-white|text-white[^"`]*bg-red-600/.test(text),
      )
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("the destructive ConfirmDialog uses the destructive variant", () => {
    const confirm = files.find(
      ({ path }) =>
        path === "components/shared/custom/confirm-dialog/index.tsx",
    );

    expect(confirm?.text).toContain(
      'buttonVariants({ variant: "destructive" })',
    );
  });
});

describe("className scan", () => {
  it("sees classes after an arrow function in onClick", () => {
    const sample = `export const X = () => (
      <Button onClick={() => go()} className="text-red-500 hover:bg-red-50">x</Button>
    );`;

    const classes = actionClassNames("sample.tsx", sample);

    expect(classes).toHaveLength(1);
    expect(RAW_RED.test(classes[0])).toBe(true);
  });

  it("does not flag the destructive token", () => {
    expect(RAW_RED.test('"text-destructive hover:bg-destructive/10"')).toBe(
      false,
    );
  });
});

/**
 * Dark theme: the destructive button read near-black on light red
 * (`--destructive-foreground: 0 60% 12%` on `0 84% 65%`). It is white on a
 * deeper red now, while `text-destructive` keeps the light red that reads
 * on a dark card. The split lives in Tailwind (bg- reads the surface token),
 * so it is measured on the CSS Tailwind actually generates.
 */
describe("destructive surface in the dark theme", () => {
  const css = readFileSync(resolve(SRC, "app/globals.css"), "utf8");

  function token(
    name: string,
    theme: "light" | "dark",
  ): [number, number, number] {
    const start =
      theme === "light" ? css.indexOf(":root") : css.indexOf(".dark {");
    const block = css.slice(start, css.indexOf("}", start));
    const match = new RegExp(
      `--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`,
    ).exec(block);

    expect(match, `--${name} (${theme})`).not.toBeNull();

    return [Number(match![1]), Number(match![2]), Number(match![3])];
  }

  async function generated(classes: string): Promise<string> {
    const { default: postcss } = await import("postcss");
    const { default: tailwindcss } = await import("tailwindcss");
    const { default: loadConfig } = await import("tailwindcss/loadConfig");
    const config = loadConfig(resolve(__dirname, "../../tailwind.config.ts"));
    const result = await postcss([
      tailwindcss({
        ...config,
        content: [{ raw: classes, extension: "html" }],
      }),
    ]).process("@tailwind utilities;", { from: undefined });

    return result.css;
  }

  it("paints bg-destructive with the surface token and keeps text on the readable one", async () => {
    const out = await generated(
      "bg-destructive hover:bg-destructive/90 text-destructive text-destructive-foreground border-destructive",
    );

    expect(out).toMatch(/\.bg-destructive \{[^}]*var\(--destructive-surface\)/);
    expect(out).toContain("hsl(var(--destructive-surface) / 0.9)");
    expect(out).toMatch(
      /\.text-destructive \{\s*color: hsl\(var\(--destructive\)\)/,
    );
    expect(out).toMatch(
      /\.border-destructive \{\s*border-color: hsl\(var\(--destructive\)\)/,
    );
  }, 30_000);

  it("puts white text on a red that clears AA in dark, as in light", async () => {
    const { contrast, hslToRgb } = await import("./helpers/contrast");

    for (const theme of ["light", "dark"] as const) {
      const [, , lightness] = token("destructive-foreground", theme);

      // White (or near-white), never dark ink on red.
      expect(lightness, theme).toBeGreaterThanOrEqual(95);
      expect(
        contrast(
          hslToRgb(token("destructive-foreground", theme)),
          hslToRgb(token("destructive-surface", theme)),
        ),
        `white on the destructive surface (${theme})`,
      ).toBeGreaterThanOrEqual(4.5);
    }

    // Still a visible control on a dark card (WCAG 1.4.11, 3:1).
    expect(
      contrast(
        hslToRgb(token("destructive-surface", "dark")),
        hslToRgb(token("card", "dark")),
      ),
    ).toBeGreaterThanOrEqual(3);
  });

  it("uses the destructive pair on the shared button and on every red confirm action", () => {
    const button = readFileSync(
      resolve(SRC, "components/ui/button.tsx"),
      "utf8",
    );

    expect(button).toContain(
      '"bg-destructive text-destructive-foreground hover:bg-destructive/90"',
    );

    // Every bg-destructive in the app carries the foreground token, so the
    // white text follows wherever the surface goes.
    const offenders = files.flatMap(({ path, text }) =>
      [...text.matchAll(/className=(?:"([^"]*)"|\{?`([^`]*)`)/g)]
        .map((match) => match[1] ?? match[2])
        .filter((value) => /(?:^|\s)bg-destructive(?:\s|$)/.test(value))
        .filter((value) => !/text-destructive-foreground/.test(value))
        .map((value) => `${path}: ${value.replace(/\s+/g, " ")}`),
    );

    expect(offenders).toEqual([]);
  });
});
