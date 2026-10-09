import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * What a route ships to the browser on first load, read from the source: the
 * modules statically reachable from a page once the walk has crossed into a
 * Client Component. Server-only modules are walked (they can render client
 * ones) but not counted; `import()` — next/dynamic or a lazy load — is a
 * separate chunk and is not followed.
 *
 * Same resolution as request-data-chains.ts. npm packages are reported as
 * `npm:<name>` and not entered.
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

/** Static imports and re-exports only, line by line (type-only ones excluded). */
function staticImportsOf(source: string): string[] {
  const statements =
    source.match(/^\s*(?:import|export)\b[^;]*?["'][^"']+["']/gm) ?? [];

  return statements
    .filter((statement) => !/^\s*(?:import|export)\s+type\s/.test(statement))
    .filter(
      (statement) =>
        /^\s*import\s+["']/.test(statement) || /\sfrom\s+["']/.test(statement),
    )
    .map((statement) => statement.match(/["']([^"']+)["']\s*$/)?.[1])
    .filter((specifier): specifier is string => Boolean(specifier));
}

function packageName(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * Files (repo-relative, forward slashes) and `npm:` packages the browser gets
 * with `entry` (a page or layout under src/app).
 */
export function clientStaticGraph(entry: string): Set<string> {
  const shipped = new Set<string>();
  const seen = new Set<string>();

  const visit = (file: string, inClient: boolean) => {
    const key = `${file}:${inClient}`;
    if (seen.has(key)) return;
    seen.add(key);

    const source = readFileSync(file, "utf8");
    const kind = directive(source);

    // A Server Action imported from the client is only a reference.
    if (inClient && kind === "server") return;

    const client = inClient || kind === "client";
    if (client) shipped.add(relative(ROOT, file).replace(/\\/g, "/"));

    for (const specifier of staticImportsOf(source)) {
      const target = resolveImport(file, specifier);

      if (target) visit(target, client);
      else if (
        client &&
        !specifier.startsWith(".") &&
        !specifier.startsWith("@/")
      ) {
        shipped.add(`npm:${packageName(specifier)}`);
      }
    }
  };

  visit(resolve(ROOT, entry), false);
  return shipped;
}
