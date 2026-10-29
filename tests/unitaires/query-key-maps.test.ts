// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CATALOG_QUERY_ROOTS } from "@/lib/catalog-sync";
import { revalidateDataToQueryKeyMap } from "@/lib/query-keys-mapping";
import { ROUTE_EVENT_QUERY_ROOTS } from "@/hooks/use-route-events";

/**
 * Every key a map points at is a key some query actually reads.
 *
 * The revalidate map had 29 entries and 9 of them named keys no `useQuery`
 * used (`occurrence_type` for `occurrence-types-select`, `delivery` for
 * `delivery-detail`, `update_fine`…). Each one was a refresh that did nothing,
 * invisible in review and only found by a user pressing the button in two
 * browsers. Read as source text so the rule holds for the key somebody adds
 * next week.
 */
const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);

    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** The first element of every query key written in the app. */
function queryKeyRoots(): Set<string> {
  const roots = new Set<string>();

  const patterns = [
    // useQuery(["x", …]) / useInfiniteQuery<T>(["x", …])
    /use(?:Infinite)?Query(?:<[^(]*?>)?\(\s*\[\s*"([^"]+)"/g,
    // useQuery({ queryKey: ["x", …] }), useCursorSearch({ queryKey: ["x", …] })
    /queryKey:\s*\[\s*"([^"]+)"/g,
    // Keys held in a constant: `const CHAT_UNREAD_QUERY_KEY = ["chat-threads", …]`
    /(?:QUERY_KEY|queryKey)\s*=\s*\[?\s*"([^"]+)"/g,
  ];

  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, "utf8");

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) roots.add(match[1]);
    }
  }

  return roots;
}

const ROOTS = queryKeyRoots();

describe("the scan itself", () => {
  it("finds the app's queries", () => {
    // A regex that matched nothing would make every assertion below vacuous.
    expect(ROOTS.size).toBeGreaterThan(30);

    for (const known of [
      "shipper",
      "occurrence-types-select",
      "delivery-detail",
      "proof_audit",
      "chat-conversation",
      "notifications",
    ]) {
      expect(ROOTS.has(known), `a varredura não achou "${known}"`).toBe(true);
    }
  });
});

describe("every mapped key has a query behind it", () => {
  it.each([
    ["revalidateDataToQueryKeyMap", Object.values(revalidateDataToQueryKeyMap)],
    [
      "CATALOG_QUERY_ROOTS (catalogChanged)",
      Object.values(CATALOG_QUERY_ROOTS),
    ],
    ["ROUTE_EVENT_QUERY_ROOTS (routeEvent)", [ROUTE_EVENT_QUERY_ROOTS]],
  ])("%s", (_name, lists) => {
    const dead = (lists as ReadonlyArray<readonly string[]>)
      .flat()
      .filter((root) => !ROOTS.has(root));

    expect(dead, "chaves que nenhuma consulta usa").toEqual([]);
  });
});

describe("revalidateDataToQueryKeyMap", () => {
  it("keeps only entries some code reads", () => {
    // Once Atualizar stopped reading it, 28 of its 29 entries were read by
    // nobody and still looked like they refreshed something.
    const sources = sourceFiles(SRC)
      .filter((file) => !file.endsWith(join("lib", "query-keys-mapping.ts")))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    const unread = Object.keys(revalidateDataToQueryKeyMap).filter(
      (entry) => !sources.includes(`revalidateDataToQueryKeyMap["${entry}"]`),
    );

    expect(unread, "entradas que ninguém lê").toEqual([]);
  });
});
