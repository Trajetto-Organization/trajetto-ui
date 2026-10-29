// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What may reach `dangerouslySetInnerHTML`: static copy, nothing else.
 *
 * The confirmation dialogs keep their bullet lists as strings with `<strong>`
 * in them and render each one as HTML. That is fine for copy written here.
 * The quote dialog did the same with the company, contact and e-mail typed
 * into the PUBLIC quote form — an anonymous visitor's text as HTML in the
 * MASTER's session, held back only by a regex in the API. It now renders them
 * as text; this keeps any dialog from interpolating data into the HTML again.
 */
const SRC = resolve(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return sourceFiles(path);

    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** The places in a file where the HTML handed over is not static copy. */
export function interpolatedInnerHtml(source: string): string[] {
  if (!source.includes("dangerouslySetInnerHTML")) return [];

  const problems: string[] = [];

  // Anything but the `data` of a copy list is new and has to be looked at.
  // The trailing comma Prettier adds when the object spans lines is not
  // part of the expression.
  for (const match of source.matchAll(/__html:\s*([^}]+?),?\s*}/g)) {
    if (match[1] !== "data") problems.push(`__html: ${match[1]}`);
  }

  // The copy lists themselves: a template literal with a placeholder puts
  // runtime data into the HTML.
  for (const match of source.matchAll(/\bdata:\s*`([^`]*)`/g)) {
    if (match[1].includes("${")) problems.push(`data: \`${match[1]}\``);
  }

  return problems;
}

describe("the HTML the dialogs hand to React", () => {
  it("flags data interpolated into a copy list", () => {
    // The quote dialog as it was.
    const before = `
      const list = [
        { data: \`Empresa: \${quote.company}\` },
        { data: \`Contato: \${quote.name}\` },
      ];
      list.map(({ data }, idx) => (
        <li key={idx} dangerouslySetInnerHTML={{ __html: data }} />
      ));
    `;

    expect(interpolatedInnerHtml(before)).toHaveLength(2);
  });

  it("flags anything other than the copy list reaching __html", () => {
    const direct = `<div dangerouslySetInnerHTML={{ __html: user.bio }} />`;

    expect(interpolatedInnerHtml(direct)).toEqual(["__html: user.bio"]);
  });

  it("is static copy everywhere in the app", () => {
    // Not markup: the public configuration as a JSON data block, which React
    // cannot write as a text child without breaking its quotes. Escaped
    // (no <, > or &) and proven inert by tests/unitaires/public-config.test.ts.
    const reviewed = new Set([
      "env/public-config-script.tsx: __html: serializePublicConfig(result.config)",
      // A constant script, allowed by its hash in the enforced CSP
      // (tests/unitaires/theme-init-script.test.ts).
      "app/layout.tsx: __html: THEME_INIT_SCRIPT",
      // The same, for the Trusted Types default policy
      // (tests/unitaires/trusted-types-default-policy.test.ts).
      "app/layout.tsx: __html: TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT",
    ]);

    const offenders = sourceFiles(SRC)
      .flatMap((file) =>
        interpolatedInnerHtml(readFileSync(file, "utf8")).map(
          (problem) => `${relative(SRC, file).replace(/\\/g, "/")}: ${problem}`,
        ),
      )
      .filter((offender) => !reviewed.has(offender));

    expect(offenders).toEqual([]);
  });
});
