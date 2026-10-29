import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What a screen reader says about a control is written in Portuguese.
 *
 * The visible text was translated long ago; the names nobody sees were not.
 * The tables' checkboxes said "Select all" and "Select row"
 * (table-selection-labels.test.ts), the 404s' way back "Back to dashboard
 * page" (protected-not-found.test.ts), and the sidebar still said "Toggle
 * Sidebar" — as its accessible name and as the tooltip a mouse user reads on
 * the rail — while the breadcrumb announced "breadcrumb" and "More". This
 * scan reads every accessible name written as a literal in src: aria-label,
 * title, the text of an sr-only span and an image's alt. The sidebar's
 * avatar read `alt="avatar_image"` — a variable name, not English, so the
 * word list alone missed it — hence the identifier check. Names a dependency
 * fills in by itself (calendar arrows, toast region, combobox list) are
 * rendered and checked in library-accessible-names-pt-br.test.ts.
 */
const ROOT = resolve(__dirname, "../..");
const SOURCE = resolve(ROOT, "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);

    return /\.(tsx|ts)$/.test(entry.name) ? [path] : [];
  });
}

/** Words that are English and never Portuguese, whole words only. */
const ENGLISH =
  /\b(toggle|sidebar|select|selected|more|close|open|back|next|previous|search|loading|breadcrumb|page|remove|delete|edit|clear|submit|cancel|copy|copied|dismiss|expand|collapse|show|hide|settings|go to|home|actions|row|all)\b/i;

/**
 * A name that reads like code: snake_case, camelCase or lowercase
 * kebab-case. Portuguese names start with a capital and use spaces, and
 * "E-mail" is not lowercase, so none of them match.
 */
const IDENTIFIER =
  /^(?:[A-Za-z0-9]+_[A-Za-z0-9_]*|[a-z]+(?:[A-Z][a-z0-9]*)+|[a-z0-9]+(?:-[a-z0-9]+)+)$/;

/**
 * Found by this scan in files another package owns, and reported to it.
 * Each entry must still be found: once the owner fixes it, the entry has to
 * go, so the list cannot quietly cover a new one.
 */
const AWAITING_OWNER: ReadonlySet<string> = new Set<string>([]);

/** Commented-out code is not shipped: `// <span className="sr-only">…` */
function withoutComments(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

function accessibleNames(source: string): string[] {
  const code = withoutComments(source);

  return [
    ...[...code.matchAll(/aria-label=\{?\s*["'`]([^"'`$]+)["'`]/g)].map(
      (match) => match[1],
    ),
    ...[...code.matchAll(/\btitle=\{?\s*["']([^"']+)["']/g)].map(
      (match) => match[1],
    ),
    ...[
      ...code.matchAll(/className="[^"]*\bsr-only\b[^"]*"\s*>([^<{]+)</g),
    ].map((match) => match[1]),
    // alt="" marks a decorative image on purpose; the filter below drops it.
    ...[...code.matchAll(/\balt=\{?\s*["'`]([^"'`$]*)["'`]/g)].map(
      (match) => match[1],
    ),
  ]
    .map((name) => name.trim())
    .filter(Boolean);
}

function where({ file, name }: { file: string; name: string }): string {
  return `${relative(ROOT, file).replace(/\\/g, "/")}: "${name}"`;
}

describe("the identifier check", () => {
  const flagged = (source: string) =>
    accessibleNames(source).filter((name) => IDENTIFIER.test(name));

  it("flags a variable name used as a name", () => {
    expect(flagged('<img alt={"avatar_image"} src={url} />')).toEqual([
      "avatar_image",
    ]);
    expect(flagged('<img alt="userAvatar" />')).toEqual(["userAvatar"]);
    expect(flagged('<input aria-label="search-input" />')).toEqual([
      "search-input",
    ]);
  });

  it("leaves Portuguese names and decorative images alone", () => {
    expect(
      flagged(
        '<img alt="Foto de perfil de Ana" /><img alt="" /><input aria-label="E-mail" /><button title="CNPJ" />',
      ),
    ).toEqual([]);
  });
});

describe("the accessible names written in src", () => {
  const files = sourceFiles(SOURCE);
  const all = files.flatMap((file) =>
    accessibleNames(readFileSync(file, "utf8")).map((name) => ({ file, name })),
  );

  it("are found (the scan reads aria-label, title, sr-only text and alt)", () => {
    expect(all.length).toBeGreaterThan(100);
    expect(all.some(({ name }) => name === "Selecionar linha")).toBe(true);
    expect(
      all.some(({ name }) => name === "Recolher ou expandir o menu lateral"),
    ).toBe(true);
    expect(all.some(({ name }) => name === "Foto enviada no chat")).toBe(true);
  });

  it("are in Portuguese", () => {
    const english = all.filter(({ name }) => ENGLISH.test(name)).map(where);

    expect(english).toEqual([]);
  });

  it("are words, not identifiers", () => {
    const identifiers = all
      .filter(({ name }) => IDENTIFIER.test(name))
      .map(where)
      .filter((entry) => !AWAITING_OWNER.has(entry));

    expect(identifiers).toEqual([]);
  });

  it("still find every entry awaiting its owner", () => {
    const found = new Set(all.map(where));
    const fixed = [...AWAITING_OWNER].filter((entry) => !found.has(entry));

    expect(fixed, "corrigido pelo dono: remova de AWAITING_OWNER").toEqual([]);
  });
});
