import { describe, expect, it } from "vitest";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Values crossing the Server/Client boundary through an IMPORT, not a prop.
 *
 * In the RSC build every export of a "use client" module, seen from a
 * Server Component, is replaced by a client reference (a Proxy). Rendering
 * it as `<Thing />` or handing it on as a prop is fine: React serialises the
 * reference. Anything else throws at request time: spreading it reads
 * Symbol.iterator ("Cannot read Symbol exports"), calling it says "Attempted
 * to call X() from the server", dotting into it says "You cannot dot into a
 * client module". The Filiais list died of the first one: the server content
 * did `tags: [...BRANCH_LIST_TAGS]` with the array exported by a client
 * module, inside a try block, so every request answered the generic error and
 * no unit test or typecheck could see it.
 *
 * `server-client-boundary.test.ts` checks hooks and props; this checks the
 * third shape, over the same graph.
 */
const SOURCE = resolve(__dirname, "../../src");

const APP = join(SOURCE, "app");

const ROUTE_ENTRIES = new Set([
  "page.tsx",
  "page.ts",
  "layout.tsx",
  "layout.ts",
  "loading.tsx",
  "template.tsx",
  "not-found.tsx",
  "default.tsx",
  "route.ts",
  "route.tsx",
]);

const IMPORT = new RegExp(
  String.raw`(?:^|\n)\s*(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]`,
  "g",
);

const DYNAMIC_IMPORT = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

function sourceFiles(directory: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
      continue;
    }

    if (/\.tsx?$/.test(entry) && !entry.endsWith(".d.ts")) found.push(path);
  }

  return found;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function declaresUseClient(source: string): boolean {
  let head = source.trimStart();

  while (head.startsWith("/*")) {
    const end = head.indexOf("*/");

    if (end < 0) break;

    head = head.slice(end + 2).trimStart();
  }

  return /^["']use client["']/.test(head);
}

function resolveImport(specifier: string, importer: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) {
    base = join(SOURCE, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(dirname(importer), specifier);
  } else {
    return null;
  }

  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.tsx"),
    join(base, "index.ts"),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not that one.
    }
  }

  return null;
}

interface ValueImport {
  symbol: string;
  specifier: string;
  statement: string;
}

/** The value bindings an import statement brings in; `type` ones erase. */
function valueImports(source: string): ValueImport[] {
  const found: ValueImport[] = [];

  const named =
    /import\s+(type\s+)?(?:([A-Za-z_$][\w$]*)\s*,\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;

  for (const match of source.matchAll(named)) {
    const [statement, typeOnly, defaultName, names, specifier] = match;

    if (typeOnly) continue;

    if (defaultName) found.push({ symbol: defaultName, specifier, statement });

    for (const piece of names.split(",")) {
      const cleaned = piece.trim();

      if (!cleaned || cleaned.startsWith("type ")) continue;

      const symbol = cleaned.includes(" as ")
        ? (cleaned.split(" as ").pop() as string).trim()
        : cleaned;

      found.push({ symbol, specifier, statement });
    }
  }

  const single =
    /import\s+(?!type\s)(?:\*\s+as\s+)?([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;

  for (const match of source.matchAll(single)) {
    const [statement, symbol, specifier] = match;

    found.push({ symbol, specifier, statement });
  }

  return found;
}

/**
 * Every use of `symbol` in `body` that is NOT one of the two safe shapes:
 * a JSX tag (`<Symbol`, `</Symbol`) or a prop value handed on untouched
 * (`={Symbol}`). Returns a short excerpt of each unsafe use.
 */
function unsafeUses(body: string, symbol: string): string[] {
  const escaped = symbol.replace(/\$/g, "\\$");
  const uses: string[] = [];

  for (const match of body.matchAll(
    new RegExp(String.raw`(?<![\w$])${escaped}(?![\w$])`, "g"),
  )) {
    const at = match.index as number;
    const before = body.slice(Math.max(0, at - 3), at);

    // `other.Symbol` is a property of something else, not this binding.
    if (before.endsWith(".") && before !== "...") continue;

    if (before.endsWith("<") || before.endsWith("</")) continue;

    const handedOn =
      /=\{\s*$/.test(body.slice(Math.max(0, at - 4), at)) &&
      /^\s*\}/.test(body.slice(at + symbol.length));

    if (handedOn) continue;

    uses.push(body.slice(Math.max(0, at - 12), at + symbol.length + 12).trim());
  }

  return uses;
}

const FILES = sourceFiles(SOURCE);

const RAW = new Map(FILES.map((path) => [path, readFileSync(path, "utf8")]));
const CLEAN = new Map(
  [...RAW].map(([path, source]) => [path, stripComments(source)]),
);

const IMPORTS = new Map<string, string[]>();

for (const [path, source] of CLEAN) {
  const targets = new Set<string>();

  for (const [, specifier] of source.matchAll(IMPORT)) {
    const target = resolveImport(specifier, path);
    if (target) targets.add(target);
  }

  for (const [, specifier] of source.matchAll(DYNAMIC_IMPORT)) {
    const target = resolveImport(specifier, path);
    if (target) targets.add(target);
  }

  IMPORTS.set(path, [...targets]);
}

const CLIENT_ROOTS = new Set(
  FILES.filter((path) => declaresUseClient(RAW.get(path) as string)),
);

const SERVER_ROOTS = FILES.filter(
  (path) =>
    path.startsWith(APP) &&
    ROUTE_ENTRIES.has(path.split(/[\\/]/).pop() as string) &&
    !CLIENT_ROOTS.has(path),
);

const SERVER_GRAPH = new Set<string>();

for (const root of SERVER_ROOTS) {
  const stack = [root];

  while (stack.length) {
    const current = stack.pop() as string;

    if (SERVER_GRAPH.has(current)) continue;

    SERVER_GRAPH.add(current);

    for (const target of IMPORTS.get(current) ?? []) {
      if (!CLIENT_ROOTS.has(target)) stack.push(target);
    }
  }
}

const show = (path: string) => relative(SOURCE, path).split("\\").join("/");

describe("the scan itself", () => {
  it("found the server graph", () => {
    // Floors, so a resolver that stops resolving cannot pass over nothing.
    expect(FILES.length).toBeGreaterThan(1_200);
    expect(CLIENT_ROOTS.size).toBeGreaterThan(300);
    expect(SERVER_GRAPH.size).toBeGreaterThan(150);
  });

  it("recognizes the spread, the call and the access as unsafe uses", () => {
    const body = [
      "const a = { tags: [...BRANCH_LIST_TAGS] };",
      "const b = refresh();",
      "const c = LABELS.active;",
    ].join("\n");

    expect(unsafeUses(body, "BRANCH_LIST_TAGS")).toHaveLength(1);
    expect(unsafeUses(body, "refresh")).toHaveLength(1);
    expect(unsafeUses(body, "LABELS")).toHaveLength(1);
  });

  it("and accepts the rendered component and the passed-on reference", () => {
    const body = [
      "return <BranchTable data={rows} />;",
      "return <Slot>{x}</Slot>;",
      "return <Dialog trigger={BranchTable} />;",
      "const d = other.BranchTable;",
    ].join("\n");

    expect(unsafeUses(body, "BranchTable")).toEqual([]);
    expect(unsafeUses(body, "Slot")).toEqual([]);
  });

  it("and reads the three value import forms, ignoring the type ones", () => {
    const source = [
      'import { A, type B, C as D } from "./x";',
      'import type { E } from "./y";',
      'import F, { G } from "./z";',
      'import * as H from "./w";',
    ].join("\n");

    expect(
      valueImports(source)
        .map((entry) => entry.symbol)
        .sort(),
    ).toEqual(["A", "D", "F", "G", "H"].sort());
  });
});

describe('the server does not use values from "use client" modules', () => {
  it("only renders or passes on what it imports from a client module", () => {
    const offenders: string[] = [];

    for (const path of SERVER_GRAPH) {
      const source = CLEAN.get(path) as string;

      for (const entry of valueImports(source)) {
        const target = resolveImport(entry.specifier, path);

        if (!target || !CLIENT_ROOTS.has(target)) continue;

        const body = source.replace(entry.statement, "");

        for (const use of unsafeUses(body, entry.symbol)) {
          offenders.push(
            `${show(path)} usa ${entry.symbol} de ${show(target)}: ${JSON.stringify(use)}`,
          );
        }
      }
    }

    expect(
      offenders,
      "um módulo que o servidor avalia usa um valor exportado por um módulo " +
        '"use client". No servidor esse valor é uma referência de cliente: ' +
        "espalhar, chamar ou acessar propriedade lança em tempo de requisição. " +
        "Mova o valor para um módulo sem diretiva e importe dos dois lados.",
    ).toEqual([]);
  });
});
