// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nothing in the web may read a NEXT_PUBLIC_* variable, but the build id.
 *
 * Next replaces every `process.env.NEXT_PUBLIC_*` with the value the BUILD
 * saw — in the browser bundle, the server bundles and the middleware alike.
 * The image is built once and promoted from staging to production (decision
 * 12.2), so such a read would ship staging's API, captcha key or map to
 * production. Public values are read at run time through src/env.
 *
 * The one exception is NEXT_PUBLIC_BUILD_SHA: it names the build itself, the
 * same in every environment, and the open tab must carry its own copy to
 * notice a deploy (DeploymentSkewGuard). It is build time by nature.
 */
const ROOT = process.cwd();
const SRC = join(ROOT, "src");

const BUILD_TIME_ONLY = new Set(["NEXT_PUBLIC_BUILD_SHA"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);

    return /\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [path] : [];
  });
}

/** Code only: a comment may explain these names. URLs keep their "//". */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/**
 * Quotes the old names in the boot error ("substitui NEXT_PUBLIC_…") and
 * reads nothing with them; a process.env read there still fails.
 */
const NAMES_IN_MESSAGES = new Set(["src/env/names.ts"]);

function publicReads(source: string, { literals = true } = {}): string[] {
  const code = withoutComments(source);
  const names = [
    // process.env.NEXT_PUBLIC_X and process.env["NEXT_PUBLIC_X"]
    ...code.matchAll(/process\.env(?:\.|\[\s*["'`])(NEXT_PUBLIC_\w+)/g),
    // A name assembled at run time: env[`NEXT_PUBLIC_${…}`], "NEXT_PUBLIC_X"
    ...(literals ? code.matchAll(/["'`](NEXT_PUBLIC_\w*)/g) : []),
  ].map((match) => match[1]);

  return names.filter((name) => !BUILD_TIME_ONLY.has(name));
}

function isClientModule(source: string): boolean {
  const head = source.replace(/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");

  return /^["']use client["']/.test(head);
}

const files = sourceFiles(SRC).map((path) => ({
  path: relative(ROOT, path).replace(/\\/g, "/"),
  source: readFileSync(path, "utf8"),
}));

/** Variables every bundle may read: Next defines them for the browser too. */
const RUNTIME_SAFE = new Set(["NODE_ENV", "NEXT_RUNTIME", ...BUILD_TIME_ONLY]);

/**
 * Modules whose FUNCTIONS read the server environment and whose constants
 * client code also needs (the site's name and e-mail). Client code may import
 * only the listed constants from them.
 */
const SERVER_FUNCTIONS_ONLY: Record<
  string,
  { reads: string[]; constants: string[] }
> = {
  "src/lib/site.ts": {
    reads: ["METADATA_BASE", "APP_ENV"],
    constants: ["siteConfig", "TITLE_SUFFIX", "MAX_PAGE_TITLE_LENGTH"],
  },
};

const sources = new Map(files.map(({ path, source }) => [path, source]));

const IMPORT_EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveImport(from: string, specifier: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) base = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith("."))
    base = relative(ROOT, join(ROOT, from, "..", specifier)).replace(
      /\\/g,
      "/",
    );
  else return null;

  for (const extension of IMPORT_EXTENSIONS) {
    if (sources.has(base + extension)) return base + extension;
  }

  return null;
}

function isServerActionModule(source: string): boolean {
  const head = source.replace(/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");

  return /^["']use server["']/.test(head);
}

/** Every module that ends up in the browser bundle (Server Actions are RPC, not code). */
function clientReachable(): Set<string> {
  const seen = new Set<string>();
  const queue = files
    .filter(({ source }) => isClientModule(source))
    .map(({ path }) => path);

  while (queue.length > 0) {
    const path = queue.pop()!;

    if (seen.has(path)) continue;
    seen.add(path);

    const code = withoutComments(sources.get(path)!);

    for (const match of code.matchAll(
      /(?:import|export)\s+(?!type\b)(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g,
    )) {
      const target = resolveImport(path, match[1] ?? match[2]);

      if (target && !isServerActionModule(sources.get(target)!))
        queue.push(target);
    }
  }

  return seen;
}

describe("the web's environment reads", () => {
  it("never read a NEXT_PUBLIC_* value inlined at build, but the build id", () => {
    const offenders = files.flatMap(({ path, source }) =>
      publicReads(source, { literals: !NAMES_IN_MESSAGES.has(path) }).map(
        (name) => `${path}: ${name}`,
      ),
    );

    expect(
      offenders,
      "leia pelo src/env (publicApiUrl, usePublicConfig)",
    ).toEqual([]);
  });

  it("never read a server variable from a client component", () => {
    const offenders = files
      .filter(({ source }) => isClientModule(source))
      .flatMap(({ path, source }) =>
        [...withoutComments(source).matchAll(/process\.env\.(\w+)/g)]
          .map((match) => match[1])
          .filter((name) => name !== "NODE_ENV" && !BUILD_TIME_ONLY.has(name))
          .map((name) => `${path}: ${name}`),
      );

    expect(offenders).toEqual([]);
  });

  // Helper modules without the directive (hooks, socket, notification
  // stream…) end up in the browser bundle all the same when a client
  // component imports them, and there `process.env.X` is undefined.
  it("follows client imports into helper modules", () => {
    const reachable = clientReachable();

    expect(reachable.has("src/socket.ts")).toBe(true);
    expect(reachable.has("src/hooks/use-cursor-search.ts")).toBe(true);
    // A Server Action is a call across the network, not bundled code.
    expect(
      [...reachable].some((path) => isServerActionModule(sources.get(path)!)),
    ).toBe(false);
  });

  it("never read a server variable from a module a client component imports", () => {
    const offenders = [...clientReachable()]
      .filter((path) => !isClientModule(sources.get(path)!))
      .flatMap((path) =>
        [
          ...withoutComments(sources.get(path)!).matchAll(
            /process\.env\.(\w+)/g,
          ),
        ]
          .map((match) => match[1])
          .filter((name) => !RUNTIME_SAFE.has(name))
          .filter(
            (name) =>
              !(
                SERVER_FUNCTIONS_ONLY[path] &&
                SERVER_FUNCTIONS_ONLY[path].reads.includes(name)
              ),
          )
          .map((name) => `${path}: ${name}`),
      );

    expect(offenders).toEqual([]);
  });

  it("client code takes only the constants of the modules whose functions read the server environment", () => {
    const offenders = [...clientReachable()].flatMap((path) => {
      const code = withoutComments(sources.get(path)!);

      return Object.entries(SERVER_FUNCTIONS_ONLY).flatMap(
        ([module, { constants }]) =>
          [
            ...code.matchAll(
              /import\s+(?!type\b)\{([^}]*)\}\s*from\s*["']([^"']+)["']/g,
            ),
          ]
            .filter((match) => resolveImport(path, match[2]) === module)
            .flatMap((match) =>
              match[1]
                .split(",")
                .map((name) => name.trim())
                // An inline `type X` import is erased from the bundle.
                .filter((name) => name && !/^type\s/.test(name))
                .map((name) => name.split(/\s+as\s+/)[0].trim())
                .filter((name) => !constants.includes(name)),
            )
            .map((name) => `${path}: ${name} (de ${module})`),
      );
    });

    expect(offenders).toEqual([]);
  });

  // The detector itself, so a refactor of the regexes cannot make it blind.
  it("catches every way of writing such a read", () => {
    for (const source of [
      "fetch(`${process.env.NEXT_PUBLIC_HTTP_REQUEST}/user/me`)",
      'const key = process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"];',
      "const url = env[`NEXT_PUBLIC_${name}`];",
      'const prefix = "NEXT_PUBLIC_MAP_TILE_";',
    ]) {
      expect(publicReads(source), source).not.toEqual([]);
    }

    expect(
      publicReads("const sha = process.env.NEXT_PUBLIC_BUILD_SHA;"),
    ).toEqual([]);
    expect(
      publicReads(
        "// process.env.NEXT_PUBLIC_HTTP_REQUEST was inlined\nconst a = 1;",
      ),
    ).toEqual([]);
    expect(
      publicReads('const site = "https://x.test"; // NEXT_PUBLIC_X'),
    ).toEqual([]);
  });
});
