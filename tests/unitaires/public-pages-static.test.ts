// @vitest-environment node
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The public site is prerendered, and one import is enough to undo that.
 *
 * The navbar used to read the session cookie to swap "Login" for
 * "Dashboard". `cookies()` in any Server Component of the tree turns the
 * whole page dynamic: the landing, the blog and the legal pages were
 * rendered per request, their `revalidate` did nothing, and the CSP comment
 * that called them prerendered was false. Nothing breaks when that happens,
 * so this walks the import graph from each public page and fails when it
 * reaches `next/headers` on the server side of the render.
 *
 * A "use server" module imported from a Client Component is only a reference
 * (it runs as a separate request), so the walk stops there; imported from a
 * Server Component it may run during the render, so it is followed.
 */
const ROOT = process.cwd();
const SRC = resolve(ROOT, "src");

const PUBLIC_ENTRIES = [
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/sobre/page.tsx",
  "src/app/gestao-de-frotas/page.tsx",
  "src/app/gestao-de-entregas/page.tsx",
  "src/app/app-do-motorista/page.tsx",
  "src/app/contato/page.tsx",
  "src/app/orcamento/page.tsx",
  "src/app/blog/layout.tsx",
  "src/app/blog/page.tsx",
  "src/app/blog/[slug]/page.tsx",
  "src/app/legal/[policy]/page.tsx",
];

const EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts"];

function resolveImport(from: string, specifier: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) base = join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return null;

  if (existsSync(base) && statSync(base).isFile()) return base;

  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

function directive(source: string): "client" | "server" | null {
  const head = source.replace(/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");

  if (/^["']use client["']/.test(head)) return "client";
  if (/^["']use server["']/.test(head)) return "server";
  return null;
}

function importsOf(source: string): string[] {
  const specifiers: string[] = [];
  const pattern =
    /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g;

  for (const match of source.matchAll(pattern)) {
    // Type-only imports vanish at compile time.
    if (/^\s*(?:import|export)\s+type\s/.test(match[0].trim())) continue;
    specifiers.push(match[1]);
  }

  return specifiers;
}

/** Chains from `entry` to a module that imports next/headers on the server side. */
function dynamicChains(entry: string): string[][] {
  const chains: string[][] = [];
  const seen = new Set<string>();

  const visit = (file: string, inClient: boolean, chain: string[]) => {
    const key = `${file}:${inClient}`;
    if (seen.has(key)) return;
    seen.add(key);

    const source = readFileSync(file, "utf8");
    const kind = directive(source);

    if (inClient && kind === "server") return;

    const client = inClient || kind === "client";
    const here = [...chain, relative(ROOT, file).replace(/\\/g, "/")];

    for (const specifier of importsOf(source)) {
      if (specifier === "next/headers" && !client) {
        chains.push(here);
        continue;
      }

      const target = resolveImport(file, specifier);
      if (target) visit(target, client, here);
    }
  };

  visit(resolve(ROOT, entry), false, []);
  return chains;
}

describe("the public pages render without request data", () => {
  it.each(PUBLIC_ENTRIES)("%s never reaches next/headers", (entry) => {
    expect(dynamicChains(entry).map((chain) => chain.join(" -> "))).toEqual([]);
  });

  it.each(PUBLIC_ENTRIES)("%s opts out of nothing", (entry) => {
    const source = readFileSync(resolve(ROOT, entry), "utf8");

    // Each of these forces a per-request render just as surely.
    expect(source).not.toMatch(
      /export const dynamic\s*=\s*["']force-dynamic["']/,
    );
    expect(source).not.toMatch(/export const revalidate\s*=\s*0\b/);
    expect(source).not.toMatch(/\bsearchParams\b/);
  });

  it("the walk does see a cookie read, so an empty result means something", () => {
    // Guard against a walker that silently resolves nothing.
    expect(
      dynamicChains("src/app/(protected)/layout.tsx").length,
    ).toBeGreaterThan(0);
  });
});
