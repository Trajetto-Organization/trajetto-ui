import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every first-load placeholder of a protected page carries
 * `data-tutorial="loading"` (or `aria-busy="true"`).
 *
 * The tour engine holds its auto-start and keeps a tour's optional steps while
 * such a marker is on screen (isPageLoading). A placeholder without it makes
 * the engine believe the page settled, and steps whose anchors have not
 * rendered yet are dropped from a first visit's tour (review round 3: the
 * Kanban board skeleton). This file makes a new unmarked placeholder fail.
 */

const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const PROTECTED = resolve(SRC, "app/(protected)");
const FEATURES = resolve(SRC, "features");

const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];
const MARKER = /data-tutorial="loading"|aria-busy="true"|aria-busy=\{true\}/;
// Only placeholder modules are followed: a marker deeper in the page proper
// would not be on screen while the page loads.
const PLACEHOLDER_MODULE = /skeleton|loading/i;

/**
 * Client-side first-load placeholders that are neither a loading.tsx nor a
 * Suspense fallback. Each one hides anchors of a tour while it shows.
 */
const CLIENT_PLACEHOLDERS: Array<{ file: string; component: string }> = [
  {
    file: "app/(protected)/_components/kanban/board-skeleton/index.tsx",
    component: "KanbanBoardSkeleton",
  },
  {
    file: "app/(protected)/_components/shared/limits/limits-content/index.tsx",
    component: "LimitsContent",
  },
];

/**
 * Loading branches inside a client panel that stand where a required tour
 * anchor will render (the anchor is not on screen until the data arrives).
 * `branch` matches the start of the conditional; the placeholder JSX right
 * after it must carry the marker, otherwise the walk gives up on the step
 * after the short wait and shows it as missing.
 */
const LOADING_BRANCHES: Array<{ file: string; branch: RegExp; count: number }> =
  [
    // control-tower-map, -active-routes, -funnel, -punctuality, -events.
    {
      file: "features/control-tower/panel.tsx",
      branch: /towerQuery\.isLoading(?: \|\| !tower)? \? \(/g,
      count: 3,
    },
    // message-templates.
    {
      file: "features/deliveries/message-templates/panel.tsx",
      branch: /if \(isLoading \|\| companyId === ""\) \{/g,
      count: 1,
    },
    // kanban-board, kanban-search: the first load shows a spinner before any column.
    {
      file: "app/(protected)/_components/kanban/board-provider/index.tsx",
      branch: /\{isLoading && !columns \? \(/g,
      count: 1,
    },
    // Integrações: the api-keys request also gates the band (revalidate,
    // integrations-docs, create-button); the other panels hold their own anchors.
    {
      file: "features/integrations/api-keys/panel.tsx",
      branch: /\{isLoading \? \(/g,
      count: 1,
    },
    {
      file: "features/integrations/webhooks/panel.tsx",
      branch: /\{isLoading \? \(/g,
      count: 1,
    },
    {
      file: "features/integrations/monitor/panel.tsx",
      branch: /\{isLoading \? \(/g,
      count: 1,
    },
  ];

/** How far after a branch the placeholder's opening tag must start. */
const BRANCH_WINDOW = 240;

const toPosix = (path: string): string => path.split("\\").join("/");

function walk(
  dir: string,
  accept: (file: string) => boolean,
  out: string[] = [],
): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) walk(full, accept, out);
    else if (accept(full)) out.push(full);
  }

  return out;
}

function resolveImport(from: string, specifier: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) base = resolve(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return null;

  for (const extension of EXTENSIONS) {
    const candidate = base + extension;

    if (
      existsSync(candidate) &&
      statSync(candidate).isFile() &&
      /\.tsx?$/.test(candidate)
    )
      return candidate;
  }

  return null;
}

/** Local name → { module, exported name } for a file's imports. */
function importsOf(
  file: string,
  source: string,
): Map<string, { module: string; name: string }> {
  const imports = new Map<string, { module: string; name: string }>();
  const IMPORT = /import\s+(?:type\s+)?([\s\S]*?)\s+from\s*['"]([^'"]+)['"]/g;

  for (const match of source.matchAll(IMPORT)) {
    const module = resolveImport(file, match[2]);

    if (!module) continue;

    const clause = match[1];
    const named = /\{([\s\S]*)\}/.exec(clause);
    const defaultName = clause
      .replace(/\{[\s\S]*\}/, "")
      .replace(/,/g, "")
      .trim();

    if (defaultName && /^\w+$/.test(defaultName))
      imports.set(defaultName, { module, name: "default" });

    for (const part of named?.[1].split(",") ?? []) {
      const [exported, local] = part
        .replace(/\btype\b/, "")
        .trim()
        .split(/\s+as\s+/);

      if (exported)
        imports.set((local ?? exported).trim(), {
          module,
          name: exported.trim(),
        });
    }
  }

  return imports;
}

/** The source of one component's definition, or the whole file. */
function componentBody(source: string, name: string): string {
  let lookup = name;

  if (name === "default") {
    const exported = /export\s+default\s+(?:function\s+)?(\w+)/.exec(source);

    if (!exported) return source;
    lookup = exported[1];
  }

  const start = new RegExp(`(?:const|function)\\s+${lookup}\\b`).exec(source);

  if (!start) return source;

  const rest = source.slice(start.index);
  const end = /\n\}\;?\s*\n/.exec(rest);

  return end ? rest.slice(0, end.index + end[0].length) : rest;
}

/** Whether this component, or a placeholder it renders, carries the marker. */
function isMarked(
  file: string,
  name: string,
  depth = 0,
  seen = new Set<string>(),
): boolean {
  const key = `${file}#${name}`;

  if (seen.has(key) || depth > 4) return false;
  seen.add(key);

  const source = readFileSync(file, "utf8");
  const body = componentBody(source, name);

  if (MARKER.test(body)) return true;

  const imports = importsOf(file, source);

  for (const match of body.matchAll(/<([A-Z]\w*)/g)) {
    const imported = imports.get(match[1]);

    if (
      imported &&
      PLACEHOLDER_MODULE.test(toPosix(relative(SRC, imported.module)))
    ) {
      if (isMarked(imported.module, imported.name, depth + 1, seen))
        return true;
    }

    // A placeholder declared in the same file.
    if (
      !imported &&
      match[1] !== name &&
      new RegExp(`(?:const|function)\\s+${match[1]}\\b`).test(source)
    ) {
      if (isMarked(file, match[1], depth + 1, seen)) return true;
    }
  }

  return false;
}

const loadingFiles = walk(PROTECTED, (file) => /[\\/]loading\.tsx$/.test(file));

describe("first-load placeholders are marked for the tour engine", () => {
  it("finds the route-level loading files", () => {
    expect(loadingFiles.length).toBeGreaterThan(40);
  });

  it.each(loadingFiles.map((file) => [toPosix(relative(SRC, file)), file]))(
    "%s",
    (_, file) => {
      expect(isMarked(file, "default")).toBe(true);
    },
  );

  const fallbacks = walk(PROTECTED, (file) => /\.tsx$/.test(file))
    .concat(walk(FEATURES, (file) => /\.tsx$/.test(file)))
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const imports = importsOf(file, source);

      return [...source.matchAll(/fallback=\{<([A-Z]\w*)/g)].map((match) => {
        const imported = imports.get(match[1]);

        return {
          label: `${toPosix(relative(SRC, file))} → ${match[1]}`,
          file: imported?.module ?? file,
          component: imported?.name ?? match[1],
        };
      });
    });

  it("finds the Suspense fallbacks", () => {
    expect(fallbacks.length).toBeGreaterThan(20);
  });

  it.each(fallbacks.map((entry) => [entry.label, entry]))(
    "Suspense fallback %s",
    (_, entry) => {
      expect(isMarked(entry.file, entry.component)).toBe(true);
    },
  );

  it.each(CLIENT_PLACEHOLDERS.map((entry) => [entry.component, entry]))(
    "client placeholder %s",
    (_, entry) => {
      expect(isMarked(resolve(SRC, entry.file), entry.component)).toBe(true);
    },
  );

  it.each(LOADING_BRANCHES.map((entry) => [entry.file, entry]))(
    "loading branches of %s",
    (_, entry) => {
      const source = readFileSync(resolve(SRC, entry.file), "utf8");
      const branches = [...source.matchAll(entry.branch)];

      expect(branches).toHaveLength(entry.count);

      for (const branch of branches) {
        const placeholder = source.slice(
          branch.index,
          (branch.index ?? 0) + BRANCH_WINDOW,
        );

        expect(placeholder).toMatch(MARKER);
      }
    },
  );

  // next/dynamic placeholders (the maps) show while the chunk downloads; the
  // route page's and the tower's map steps are required.
  const dynamicPlaceholders = walk(PROTECTED, (file) => /\.tsx$/.test(file))
    .concat(walk(FEATURES, (file) => /\.tsx$/.test(file)))
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");

      return [...source.matchAll(/loading:\s*\(\)\s*=>\s*\(/g)].map(
        (match) => ({
          label: toPosix(relative(SRC, file)),
          placeholder: source.slice(
            match.index,
            (match.index ?? 0) + BRANCH_WINDOW,
          ),
        }),
      );
    });

  it("finds the next/dynamic placeholders", () => {
    expect(dynamicPlaceholders.length).toBeGreaterThanOrEqual(6);
  });

  it.each(dynamicPlaceholders.map((entry) => [entry.label, entry]))(
    "next/dynamic placeholder in %s",
    (_, entry) => {
      expect(entry.placeholder).toMatch(MARKER);
    },
  );
});
