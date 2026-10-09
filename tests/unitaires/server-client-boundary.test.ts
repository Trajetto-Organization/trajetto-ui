import { describe, expect, it } from "vitest";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * The Server/Client boundary, checked as a property of the module graph.
 *
 * Two runtime failures found by hand in /admin were the same mistake wearing
 * two faces, and neither was visible in the source of the file that broke:
 *
 *   - `src/components/ui/table.tsx` calls `useRef`. Nothing is wrong with
 *     that line. It became a crash because a `loading.tsx` — a Server
 *     Component — imported it, and `useRef` does not exist on the server.
 *     Reading table.tsx tells you nothing; reading loading.tsx tells you
 *     nothing. Only the EDGE between them is the defect.
 *   - `features/deliveries/content` passes `icon={Building2}` to `EmptyState`.
 *     Also fine on its own. It became a crash because EmptyState carried
 *     "use client", and a lucide icon is a function, and functions cannot be
 *     serialised into the RSC payload.
 *
 * Both are graph properties, and a graph property is exactly what no amount of
 * careful reading catches — which is why they survived a full manual pass, a
 * typecheck, 306 unit tests and 53 browser tests. So the fix is not "we fixed
 * the two files": it is this, computed over every module, every run.
 *
 * Next's rules, stated once so the code below can be read against them:
 *
 *   - "use client" is an ENTRY POINT into the client graph, not a property of
 *     one file. Everything the marked module imports is compiled as client
 *     code, directive or not.
 *   - a module with no directive is UNIVERSAL: it belongs to whichever graph
 *     imports it, and it can be in both at once.
 *   - a module reachable from an App Router server file WITHOUT crossing a
 *     "use client" module is evaluated on the server. React hooks throw there.
 *   - props crossing from a server module into a client module must be
 *     serialisable: JSON-ish values, and React ELEMENTS. Not functions, not
 *     classes, not class instances.
 *
 * Deliberately a source scan rather than a browser test. The property is about
 * every module in the product — including the ones nobody has written a screen
 * test for, and the one somebody adds next week. Opening 60 screens to ask
 * each of them one question costs minutes and still misses the 61st.
 */
const SOURCE = resolve(__dirname, "../../src");

const APP = join(SOURCE, "app");

/**
 * The App Router files that are Server Components unless marked otherwise.
 *
 * `error.tsx` and `global-error.tsx` are deliberately absent: Next REQUIRES
 * them to be client (they receive `reset`), so they are never server roots.
 */
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

const HOOK = new RegExp(
  String.raw`\b(?:React\.)?(use[A-Z][A-Za-z0-9_]*)\s*[(<]`,
  "g",
);

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

/** Comments hold example code and prose; neither is an import or a hook. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Whether the file opens with the directive.
 *
 * It only counts at the very top — a `"use client"` placed after an import is
 * silently ignored by the bundler, which is the most deceptive shape this
 * mistake has: the line is right there in the diff and does nothing.
 */
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

const SERVER_ROOTS = new Set(
  FILES.filter(
    (path) =>
      path.startsWith(APP) &&
      ROUTE_ENTRIES.has(path.split(/[\\/]/).pop() as string) &&
      !CLIENT_ROOTS.has(path),
  ),
);

/**
 * Everything the server actually evaluates.
 *
 * The walk stops at every client root, which is the whole point: that module
 * and everything under it is compiled for the browser, so hooks are fine
 * there. What is left is the set where they are not.
 */
const SERVER_GRAPH = new Set<string>();
const REACHED_VIA = new Map<string, string>();

for (const root of SERVER_ROOTS) {
  const stack = [root];

  while (stack.length) {
    const current = stack.pop() as string;

    if (SERVER_GRAPH.has(current)) continue;

    SERVER_GRAPH.add(current);

    for (const target of IMPORTS.get(current) ?? []) {
      if (CLIENT_ROOTS.has(target)) continue;

      if (!SERVER_GRAPH.has(target)) {
        REACHED_VIA.set(target, current);
        stack.push(target);
      }
    }
  }
}

const show = (path: string) => relative(SOURCE, path).split("\\").join("/");

describe("the scan itself", () => {
  it("found the graph, both sides of it", () => {
    /*
      Without this, a resolver that stopped resolving would empty every set
      below and the whole file would pass over nothing — which is how a rule
      quietly stops being a rule. Floors, not `> 0`: the failure worth
      catching is the count SHRINKING because an import shape stopped being
      understood.
    */
    expect(FILES.length).toBeGreaterThan(1_200);

    expect(CLIENT_ROOTS.size).toBeGreaterThan(300);
    expect(SERVER_ROOTS.size).toBeGreaterThan(100);

    expect(
      SERVER_GRAPH.size,
      "o grafo do servidor ficou pequeno demais para ser verdade",
    ).toBeGreaterThan(150);
  });

  it("and knows that a directive off the first line does not count", () => {
    // The check the scan itself depends on. A `"use client"` after an import
    // is ignored by the bundler, so treating it as a boundary would make this
    // whole file blind exactly where somebody thought they were being safe.
    expect(declaresUseClient('import x from "y";\n"use client";')).toBe(false);
    expect(declaresUseClient('"use client";\nimport x from "y";')).toBe(true);
    expect(declaresUseClient('/* licença */\n"use client";')).toBe(true);
  });
});

describe("no React hook is called on the server", () => {
  /**
   * The bug the human hit on /admin, as a property.
   *
   * `src/components/ui/table.tsx` was in this set: a `loading.tsx` imported
   * it, `loading.tsx` is a Server Component, and `useRef` does not exist
   * there. The screen answered with the error boundary and nothing in the
   * source of either file looked wrong.
   */
  const offenders = [...SERVER_GRAPH]
    .map((path) => {
      const hooks = [
        ...new Set(
          [...(CLEAN.get(path) as string).matchAll(HOOK)].map((m) => m[1]),
        ),
      ];

      return { path, hooks };
    })
    .filter((entry) => entry.hooks.length > 0);

  it("in no module reachable from a route", () => {
    const named = offenders.map((entry) => {
      const via = REACHED_VIA.get(entry.path);

      return `${show(entry.path)} chama ${entry.hooks.join(", ")}${
        via ? ` (importado por ${show(via)})` : " (é a própria rota)"
      }`;
    });

    expect(
      named,
      "hook chamado num módulo que o servidor avalia: ou o módulo precisa de " +
        '"use client", ou quem o importa não deveria importá-lo',
    ).toEqual([]);
  });
});

/**
 * What crosses into a Client Component, and whether React can serialise it.
 *
 * Only the props a server module hands a client module matter. Reading the
 * JSX needs a real scanner rather than a regex: props hold braces, nested JSX,
 * strings and newlines, and a pattern that stops at the first `>` stops inside
 * `icon={<Foo />}` or `title={a > b ? x : y}`. The first version of this scan
 * used a regex and found ZERO crossings in a codebase with seven — and a scan
 * that finds nothing is indistinguishable from a clean codebase.
 */
function openingTags(
  source: string,
): Array<{ name: string; props: string; at: number }> {
  const tags: Array<{ name: string; props: string; at: number }> = [];

  const start = /<([A-Z][\w.]*)(?=[\s/>])/g;

  for (const match of source.matchAll(start)) {
    let index = (match.index as number) + match[0].length;

    let depth = 0;
    let quote: string | null = null;

    while (index < source.length) {
      const character = source[index];

      if (quote) {
        if (character === quote && source[index - 1] !== "\\") quote = null;
      } else if (character === '"' || character === "'" || character === "`") {
        quote = character;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
      } else if (character === ">" && depth === 0) {
        break;
      }

      index += 1;
    }

    if (index >= source.length) continue;

    tags.push({
      name: match[1],
      props: source.slice((match.index as number) + match[0].length, index),
      at: match.index as number,
    });
  }

  return tags;
}

function importedSymbols(source: string): Map<string, string> {
  const table = new Map<string, string>();

  const named = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;

  for (const [, names, specifier] of source.matchAll(named)) {
    for (const piece of names.split(",")) {
      const cleaned = piece.trim().replace(/^type\s+/, "");

      if (!cleaned) continue;

      const symbol = cleaned.includes(" as ")
        ? (cleaned.split(" as ").pop() as string).trim()
        : cleaned;

      table.set(symbol, specifier);
    }
  }

  const fallback =
    /import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s*from\s*['"]([^'"]+)['"]/g;

  for (const [, symbol, specifier] of source.matchAll(fallback)) {
    table.set(symbol, specifier);
  }

  return table;
}

/** `prop={Identifier}` — a bare capitalised reference, which is a component. */
const COMPONENT_PROP = /(\w+)=\{\s*([A-Z][\w.]*)\s*\}/g;

/** `prop={() => ...}` and `prop={function ...}` — closures. */
const CLOSURE_PROP = /(\w+)=\{\s*(?:async\s*)?(?:\([^)]*\)\s*=>|function\b)/g;

/** `prop={new Thing(...)}` — a class instance. */
const INSTANCE_PROP = /(\w+)=\{\s*new\s+([A-Z][\w.]*)/g;

const SERVER_ONLY = [...SERVER_GRAPH].filter(
  (path) => !CLIENT_ROOTS.has(path) && path.endsWith(".tsx"),
);

const crossings: Array<{
  file: string;
  line: number;
  component: string;
  prop: string;
  value: string;
}> = [];

for (const path of SERVER_ONLY) {
  const source = CLEAN.get(path) as string;
  const symbols = importedSymbols(source);

  for (const tag of openingTags(source)) {
    if (!tag.props.trim()) continue;

    const specifier = symbols.get(tag.name);

    if (!specifier) continue;

    const target = resolveImport(specifier, path);

    // A package, or a module in our own server graph: not a boundary.
    if (!target || !CLIENT_ROOTS.has(target)) continue;

    const line = source.slice(0, tag.at).split("\n").length;

    const record = (prop: string, value: string) => {
      crossings.push({
        file: show(path),
        line,
        component: tag.name,
        prop,
        value,
      });
    };

    for (const [, prop, value] of tag.props.matchAll(COMPONENT_PROP)) {
      if (prop === "key" || prop === "ref") continue;

      /*
        A capitalised identifier is a component or a class nine times in ten,
        and a SCREAMING_CONSTANT the tenth. Constants are serialisable, so
        they are not the defect this is looking for.
      */
      if (/^[A-Z0-9_]+$/.test(value)) continue;

      record(prop, value);
    }

    for (const [, prop] of tag.props.matchAll(CLOSURE_PROP)) {
      record(prop, "(...) => ...");
    }

    for (const [, prop, constructor] of tag.props.matchAll(INSTANCE_PROP)) {
      record(prop, `new ${constructor}`);
    }
  }
}

describe("nothing React cannot serialize crosses to the client", () => {
  /**
   * The second bug the human hit, as a property.
   *
   * `icon={Building2}` from a Server Component into a `"use client"`
   * `EmptyState`. A lucide icon is a function — React cannot put it in the
   * RSC payload — and the screen died with "Functions cannot be passed
   * directly to Client Components". It only happened on /admin because the
   * branch that renders it is the one asking a master to pick a company, and
   * /dashboard never asks.
   *
   * React elements ARE serialisable, so `icon={<Building2 />}` would be fine
   * and is not reported here; a bare `Building2` is the reference to a
   * function and is not.
   */
  it("neither a function, nor a component, nor a class instance", () => {
    const named = crossings.map(
      (crossing) =>
        `${crossing.file}:${crossing.line} <${crossing.component} ${crossing.prop}={${crossing.value}}>`,
    );

    expect(
      named,
      "um Server Component está passando algo não serializável para um " +
        'Client Component. Ou o componente que recebe não precisa de "use ' +
        'client", ou o valor precisa virar um dado (uma string, um elemento ' +
        "já renderizado, ou uma Server Action)",
    ).toEqual([]);
  });
});

describe("the files Next requires to be client", () => {
  it("error.tsx and global-error.tsx declare the directive", () => {
    /**
     * Not a style rule: an `error.tsx` receives `reset()` and is rendered as
     * a boundary, which React can only do on the client. Without the
     * directive the file does not merely warn — the boundary does not exist,
     * and the failure it was written for takes the whole segment down to the
     * nearest parent instead.
     */
    const boundaries = FILES.filter((path) =>
      /(^|[\\/])(global-)?error\.tsx$/.test(path),
    );

    expect(boundaries.length, "nenhum error.tsx encontrado").toBeGreaterThan(0);

    const missing = boundaries
      .filter((path) => !CLIENT_ROOTS.has(path))
      .map(show);

    expect(missing, 'error.tsx sem "use client" não intercepta nada').toEqual(
      [],
    );
  });
});
