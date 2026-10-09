// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { rendersPerRequest } from "@/lib/content-security-policy";

/**
 * The enforced CSP hands a nonce only to pages rendered per request. Next
 * stamps that nonce on its scripts while it renders; a page served from the
 * prerender cache has none, so the strict policy would block every script on
 * it. This walks every page under src/app and checks that each one the
 * middleware treats as per-request really is dynamic: the page or one of its
 * layouts is `force-dynamic` or reads cookies().
 */
const APP = resolve(process.cwd(), "src/app");

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) return pages(path);

    return entry === "page.tsx" ? [path] : [];
  });
}

/** URL of a page file: route groups dropped, dynamic segments filled in. */
function urlOf(page: string): string {
  const segments = relative(APP, dirname(page))
    .split(sep)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment))
    .map((segment) => (segment.startsWith("[") ? "x" : segment));

  return `/${segments.join("/")}`;
}

const DYNAMIC =
  /export const dynamic = ["']force-dynamic["']|\bcookies\(\)|\bheaders\(\)/;

/** The page and every layout above it, up to the root layout. */
function renderChain(page: string): string[] {
  const chain = [page];
  let dir = dirname(page);

  for (;;) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout)) chain.push(layout);
    if (dir === APP) break;
    dir = dirname(dir);
  }

  return chain;
}

const perRequest = pages(APP).filter((page) => rendersPerRequest(urlOf(page)));

describe("pages that get the nonce", () => {
  it("include the sign-in pages, the private area and the public token pages", () => {
    const urls = perRequest.map(urlOf);

    expect(urls).toEqual(
      expect.arrayContaining([
        "/login",
        "/forgot",
        "/dashboard",
        "/acompanhar/x",
        "/verificar/x",
        "/docs",
      ]),
    );
  });

  it.each(perRequest.map((page) => [urlOf(page), page]))(
    "%s renders per request",
    (_url, page) => {
      const dynamic = renderChain(page).some((file) => {
        // The root layout must stay static (decision 10.4); it does not count.
        if (file === join(APP, "layout.tsx")) return false;

        return DYNAMIC.test(readFileSync(file, "utf8"));
      });

      expect(dynamic).toBe(true);
    },
  );
});

describe("pages that stay prerendered", () => {
  it("get the variant without a nonce", () => {
    for (const url of [
      "/",
      "/blog",
      "/blog/x",
      "/legal/x",
      "/sobre",
      "/contato",
      "/orcamento",
      "/gestao-de-frotas",
      "/app-do-motorista",
    ]) {
      expect(rendersPerRequest(url)).toBe(false);
    }
  });
});
