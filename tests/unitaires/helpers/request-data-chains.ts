import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Import chains from a page to a module that reads request data
 * (`next/headers`: cookies, headers) on the server side of the render. One
 * such import anywhere in the tree turns a prerendered page dynamic, and
 * nothing breaks visibly when it happens.
 *
 * Same walk as public-pages-static.test.ts: a "use server" module imported
 * from a Client Component is only a reference and is not followed; imported
 * from a Server Component it may run during the render, so it is.
 */
const ROOT = process.cwd();
const SRC = resolve(ROOT, "src");
const EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts"];

function resolveImport(from: string, specifier: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) base = join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return null;

  if (existsSync(base) && statSync(base).isFile())
    return /\.(ts|tsx)$/.test(base) ? base : null;

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
  const pattern =
    /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g;

  return [...source.matchAll(pattern)]
    .filter((match) => !/^\s*(?:import|export)\s+type\s/.test(match[0].trim()))
    .map((match) => match[1]);
}

export function requestDataChains(entry: string): string[] {
  const chains: string[] = [];
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
        chains.push(here.join(" -> "));
        continue;
      }

      const target = resolveImport(file, specifier);
      if (target) visit(target, client, here);
    }
  };

  visit(resolve(ROOT, entry), false, []);
  return chains;
}
