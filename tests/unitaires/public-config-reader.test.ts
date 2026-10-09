// @vitest-environment node
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readPublicConfig, type PublicConfig } from "@/env/public-config";
import { publicConfigSchema } from "@/env/public-config-schema";
import { checkWebEnv } from "@/env/server";

/**
 * The browser reads the public configuration without zod.
 *
 * zod was ~12.7 KB gzip of every page, the public site included, only to
 * re-check JSON the server had just validated. The browser now reads it with
 * `readPublicConfig`; the zod schema stays on the server. The two must give
 * the same answer for anything the page could find in the element or at
 * /public-config.json, and the browser's module graph must not reach zod.
 */
const VALID: PublicConfig = {
  apiUrl: "https://api.trajetto.com.br",
  socketUrl: "https://api.trajetto.com.br",
  siteUrl: "https://trajetto.com.br",
  turnstileSiteKey: "0x4AAAA",
  appEnv: "production",
  mapTiles: {
    url: "https://tiles.example/{z}/{x}/{y}.png",
    attribution: "© Exemplo",
  },
};

const CASES: Array<[string, unknown]> = [
  ["a valid configuration", VALID],
  [
    "nullable fields as null",
    { ...VALID, siteUrl: null, turnstileSiteKey: null, mapTiles: null },
  ],
  ["an unknown field (dropped)", { ...VALID, extra: "x" }],
  [
    "http in development",
    {
      ...VALID,
      apiUrl: "http://localhost:3333",
      socketUrl: "http://localhost:3333",
      appEnv: "development",
    },
  ],
  ["an ftp API URL", { ...VALID, apiUrl: "ftp://api.example" }],
  ["a javascript: socket URL", { ...VALID, socketUrl: "javascript:alert(1)" }],
  ["a relative URL", { ...VALID, apiUrl: "/api" }],
  ["a non-URL site", { ...VALID, siteUrl: "trajetto" }],
  ["an empty captcha key", { ...VALID, turnstileSiteKey: "" }],
  ["a numeric captcha key", { ...VALID, turnstileSiteKey: 12 }],
  ["an unknown environment", { ...VALID, appEnv: "homolog" }],
  [
    "map tiles without attribution",
    { ...VALID, mapTiles: { url: "https://x/{z}/{x}/{y}" } },
  ],
  ["map tiles as a string", { ...VALID, mapTiles: "https://x" }],
  [
    "map tiles with a dark style",
    {
      ...VALID,
      mapTiles: {
        ...VALID.mapTiles,
        dark: { url: "https://d/{z}/{x}/{y}", attribution: "© D" },
      },
    },
  ],
  [
    "a dark style without attribution",
    {
      ...VALID,
      mapTiles: { ...VALID.mapTiles, dark: { url: "https://d/{z}/{x}/{y}" } },
    },
  ],
  [
    "a dark style as null",
    { ...VALID, mapTiles: { ...VALID.mapTiles, dark: null } },
  ],
  ["a missing API URL", { ...VALID, apiUrl: undefined }],
  ["a missing field", (({ appEnv: _appEnv, ...rest }) => rest)(VALID)],
  ["an array", [VALID]],
  ["null", null],
  ["a string", JSON.stringify(VALID)],
];

describe("readPublicConfig", () => {
  it.each(CASES)("answers like the zod schema for %s", (_label, value) => {
    const parsed = publicConfigSchema.safeParse(value);

    expect(readPublicConfig(value)).toEqual(
      parsed.success ? parsed.data : null,
    );
  });

  it("keeps only the known fields", () => {
    expect(readPublicConfig({ ...VALID, extra: "x" })).toEqual(VALID);
  });
});

describe("the server's boot check", () => {
  it("still validates the configuration it hands out with the zod schema", () => {
    const { issues } = checkWebEnv({
      NODE_ENV: "development",
      HTTP_REQUEST: "http://localhost:3333",
      PUBLIC_API_URL: "http://localhost:3333",
    });

    expect(
      issues.filter((issue) => issue.includes("public-config-schema")),
    ).toEqual([]);
  });

  it("lists a relative HTTP_REQUEST as invalid instead of throwing", () => {
    // zod ran `new URL(value)` in a refinement even after `.url()` failed.
    const check = () =>
      checkWebEnv({
        NODE_ENV: "development",
        HTTP_REQUEST: "api-interna",
        PUBLIC_API_URL: "http://localhost:3333",
      });

    expect(check).not.toThrow();
    expect(check().issues).toContain(
      "HTTP_REQUEST: URL inválida (precisa ser http:// ou https://)",
    );
  });
});

describe("the browser's configuration modules", () => {
  const SRC = resolve(process.cwd(), "src");

  function resolveLocal(from: string, specifier: string): string | null {
    let base: string;

    if (specifier.startsWith("@/")) base = join(SRC, specifier.slice(2));
    else if (specifier.startsWith("."))
      base = resolve(dirname(from), specifier);
    else return null;

    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      join(base, "index.ts"),
      join(base, "index.tsx"),
    ]) {
      if (existsSync(candidate) && statSync(candidate).isFile())
        return candidate;
    }

    return null;
  }

  /** Every package a module and its local imports pull in (type-only imports excluded). */
  function packagesReached(entry: string): Set<string> {
    const seen = new Set<string>();
    const packages = new Set<string>();
    const queue = [entry];

    while (queue.length > 0) {
      const path = queue.pop() as string;

      if (seen.has(path)) continue;
      seen.add(path);

      const source = readFileSync(path, "utf8");

      for (const match of source.matchAll(
        /^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']|^import\s+["']([^"']+)["']/gm,
      )) {
        const specifier = match[1] ?? match[2];
        const local = resolveLocal(path, specifier);

        if (local) queue.push(local);
        else if (!specifier.startsWith("@/") && !specifier.startsWith("."))
          packages.add(specifier);
      }
    }

    return packages;
  }

  it.each([
    "env/client.ts",
    "env/use-public-config.ts",
    "env/public-config-prefetch.tsx",
  ])("%s does not pull zod into the page", (entry) => {
    expect([...packagesReached(join(SRC, entry))]).not.toContain("zod");
  });
});
