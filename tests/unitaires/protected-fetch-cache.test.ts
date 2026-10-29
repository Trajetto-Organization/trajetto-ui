// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nothing fetched with somebody's token is ever kept in Next's data cache.
 *
 * Today the authenticated fetches stay out of it only by accident: each page
 * reads `cookies()` before rendering, which zeroes the segment's revalidate and
 * trips Next's "auto no cache" for requests with an Authorization header. One
 * `next: { revalidate: 300 }` or `cache: "force-cache"` on such a fetch, and
 * the answer is written to `.next/cache/fetch-cache` keyed by that token — a
 * list that keeps being served after the session is revoked or the person's
 * permissions change, until it expires.
 *
 * `fetchCache = "only-no-store"` on the authenticated tree closes that for
 * good: an explicit revalidate becomes inert and `force-cache` throws instead
 * of silently caching. `force-dynamic` and `default-no-store` do not cover an
 * explicit revalidate in Next 14.
 */
const SRC = resolve(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return sourceFiles(path);

    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Every `fetch(...)` call in a file, up to its matching parenthesis. */
function fetchCalls(source: string): string[] {
  const calls: string[] = [];

  for (const match of source.matchAll(/\bfetch\s*\(/g)) {
    let depth = 0;
    const start = match.index ?? 0;

    for (let index = start; index < source.length; index += 1) {
      const char = source[index];

      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;

      if (depth === 0 && char === ")") {
        calls.push(source.slice(start, index + 1));
        break;
      }
    }
  }

  return calls;
}

function cachesAuthenticated(call: string): boolean {
  if (!/Authorization/.test(call)) return false;

  return (
    /force-cache/.test(call) || /revalidate:\s*([1-9]\d*|false)\b/.test(call)
  );
}

describe("the authenticated tree", () => {
  it("never stores a fetch in the data cache", () => {
    const layout = readFileSync(
      resolve(SRC, "app/(protected)/layout.tsx"),
      "utf8",
    );

    expect(layout).toMatch(/export const fetchCache = "only-no-store";/);
  });
});

describe("fetches that carry a token", () => {
  it("flags a cached authenticated fetch", () => {
    const call = `fetch(url, {
      headers: { Authorization: \`Bearer \${token}\` },
      next: { revalidate: 300 },
    })`;

    expect(fetchCalls(call).some(cachesAuthenticated)).toBe(true);
    expect(
      cachesAuthenticated(
        `fetch(url, { headers: { Authorization: "x" }, next: { tags: ["a"] } })`,
      ),
    ).toBe(false);
  });

  it("never opt into the cache, anywhere in the app", () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      fetchCalls(readFileSync(file, "utf8"))
        .filter(cachesAuthenticated)
        .map((call) => `${relative(SRC, file)}: ${call.slice(0, 80)}`),
    );

    expect(offenders).toEqual([]);
  });
});
