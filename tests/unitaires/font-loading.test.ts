// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every web font the app loads must be applied somewhere.
 *
 * The root layout loaded SF Pro (a 335 KB OTF) and Inter into `--font-sf` /
 * `--font-inter`, and neither Tailwind nor any stylesheet ever read those
 * variables: the text was always the system stack from Tailwind's preflight.
 * Browsers skip an unused @font-face, so visitors were spared the download,
 * but every page carried the rules and the image ~560 KB of font files that
 * no page painted with — and the next person to use the variable would have
 * switched the whole site's typography by accident.
 */
const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

const sources = filesUnder(SRC);

const fontLoaders = sources
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => ({ file, text: readFileSync(file, "utf8") }))
  .filter(({ text }) => /from\s+["']next\/font\/(local|google)["']/.test(text));

const styleText = [
  readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8"),
  ...sources
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFileSync(file, "utf8")),
].join("\n");

describe("web fonts", () => {
  it("applies every CSS variable a next/font loader declares", () => {
    const unused = fontLoaders.flatMap(({ file, text }) =>
      [...text.matchAll(/variable:\s*["'](--[\w-]+)["']/g)]
        .map((match) => match[1])
        .filter((variable) => !styleText.includes(`var(${variable})`))
        .map((variable) => `${path.relative(ROOT, file)}: ${variable}`),
    );

    expect(unused).toEqual([]);
  });

  it("builds without the network: no font is downloaded at build time", () => {
    // next/font/google fetched the files from Google on every `next build`;
    // a failed download failed the build (three times on 30/10/2026).
    const google = sources
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        /from\s+["']next\/font\/google["']/.test(readFileSync(file, "utf8")),
      )
      .map((file) => path.relative(ROOT, file));

    expect(google).toEqual([]);

    const missing = fontLoaders.flatMap(({ file, text }) =>
      [...text.matchAll(/src:\s*["'](\.[^"']+)["']/g)]
        .map((match) => path.resolve(path.dirname(file), match[1]))
        .filter((font) => !sources.includes(font))
        .map((font) => path.relative(ROOT, font)),
    );

    expect(missing).toEqual([]);
  });

  it("keeps each font's license next to it (SIL OFL)", () => {
    const fonts = path.join(SRC, "app", "fonts");
    const licenses = readdirSync(fonts).filter((name) =>
      name.endsWith("-OFL.txt"),
    );

    expect(licenses.sort()).toEqual([
      "Inter-OFL.txt",
      "InterTight-OFL.txt",
      "JetBrainsMono-OFL.txt",
    ]);
    for (const license of licenses)
      expect(readFileSync(path.join(fonts, license), "utf8")).toContain(
        "SIL OPEN FONT LICENSE Version 1.1",
      );
  });

  it("ships no font file under src that no loader references", () => {
    const loaderText = fontLoaders.map(({ text }) => text).join("\n");

    const orphans = sources
      .filter((file) => /\.(otf|ttf|woff2?)$/i.test(file))
      .filter((file) => !loaderText.includes(path.basename(file)))
      .map((file) => path.relative(ROOT, file));

    expect(orphans).toEqual([]);
  });
});
