// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No code that runs in the browser reads the access token (contract §15:
 * no token readable by page JavaScript).
 *
 * The token used to reach the page through `getCookies("tkey")`, a Server
 * Action: the Socket.IO handshake and a dozen hooks called the API straight
 * from the browser with it. The socket now takes a one-use ticket and those
 * reads go through the same-origin relay, so this walks the real client
 * module graph — every "use client" file and everything it imports, up to a
 * "use server" boundary (which the bundler turns into a reference) — and
 * fails if any of it touches the token.
 */
const SRC = resolve(process.cwd(), "src");

const LEGACY_DEAD =
  /[\\/]sanity[\\/]|[\\/]sanity-revalidate[\\/]|[\\/]components[\\/]blog[\\/]/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) return files(path);

    return /\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts") ? [path] : [];
  });
}

const DIRECTIVE = (name: string) =>
  new RegExp(`^(?:\\s|//[^\\n]*\\n|/\\*[\\s\\S]*?\\*/)*["']${name}["']`);

const isClient = (source: string) => DIRECTIVE("use client").test(source);
const isServerAction = (source: string) => DIRECTIVE("use server").test(source);

function resolveLocal(from: string, specifier: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) base = join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return null;

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }

  return null;
}

function importsOf(path: string, source: string): string[] {
  const specifiers = [
    ...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g),
  ].map((match) => match[1]);

  return specifiers.flatMap((specifier) => {
    const target = resolveLocal(path, specifier);

    return target ? [target] : [];
  });
}

const all = files(SRC).filter((path) => !LEGACY_DEAD.test(path));
const sources = new Map(all.map((path) => [path, readFileSync(path, "utf8")]));

/** Every module that can end up in a browser bundle. */
function clientGraph(): Set<string> {
  const seen = new Set<string>();
  const queue = all.filter((path) => isClient(sources.get(path) as string));

  while (queue.length > 0) {
    const path = queue.pop() as string;

    if (seen.has(path)) continue;

    const source = sources.get(path) ?? readFileSync(path, "utf8");

    // A Server Action module is a reference in the bundle, not its code.
    if (isServerAction(source)) continue;

    seen.add(path);
    queue.push(...importsOf(path, source));
  }

  return seen;
}

const key = (path: string) => relative(SRC, path).split("\\").join("/");

const graph = clientGraph();

describe("the browser never reads the access token", () => {
  it("walks a real client graph", () => {
    expect(graph.size).toBeGreaterThan(300);
    expect([...graph].map(key)).toContain("socket.ts");
    expect([...graph].map(key)).toContain("hooks/use-cursor-search.ts");
  });

  it.each([...graph].map((path) => [key(path), path]))(
    "%s does not touch tkey or the cookie reader",
    (_name, path) => {
      const source = sources.get(path) ?? readFileSync(path, "utf8");
      const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");

      expect(code).not.toMatch(/["'`]tkey["'`]/);
      expect(code).not.toMatch(/\bgetCookies\s*\(/);
      expect(code).not.toMatch(
        /from\s+["'](?:@\/actions\/cookies|(?:\.\.?\/)+cookies)["']/,
      );
      expect(code).not.toMatch(/from\s+["']next\/headers["']/);
    },
  );

  it("the cookie reader is server-only, not a Server Action", () => {
    const reader = readFileSync(
      join(SRC, "actions", "cookies", "index.ts"),
      "utf8",
    );

    expect(isServerAction(reader)).toBe(false);
    expect(reader).toMatch(/^import ["']server-only["'];/m);
  });

  it("no Server Action hands the access token back", () => {
    for (const [path, source] of sources) {
      if (!isServerAction(source)) continue;

      expect(source, key(path)).not.toMatch(
        /return\s+(?:await\s+)?getCookies\s*\(/,
      );
      expect(source, key(path)).not.toMatch(
        /return\s+(?:tokenAccess|accessToken|token)\s*;/,
      );
      expect(source, key(path)).not.toMatch(
        /return\s*\{[^}]*\b(?:token|tokenAccess|accessToken)\s*[,}]/,
      );
      expect(source, key(path)).not.toMatch(
        /return\s*\{[^}]*\btoken\s*:\s*(?:tokenAccess|accessToken)\b/,
      );
    }
  });
});
