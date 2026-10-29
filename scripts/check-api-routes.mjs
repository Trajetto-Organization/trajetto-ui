#!/usr/bin/env node
/**
 * Does the API in production serve every path this web build calls?
 *
 * The web and the API are promoted by two separate buttons with nothing in
 * between. A web build that calls a route production does not serve yet —
 * or no longer serves — answers 404 on that screen until the other side
 * catches up. The order is "API first, then web", and this makes the promote
 * job check it instead of trusting it.
 *
 * Path shapes only, the same reading as trajetto-api's
 * tests/unitaires/contract/client-routes.test.ts: every
 * `${process.env.HTTP_REQUEST}/…` (or `${await publicApiUrl()}/…`) template in src (or a relayUrl call), with `${…}` standing for
 * one segment, against the `paths` of the API's OpenAPI document. Methods and
 * bodies are not compared; it is a floor.
 *
 * Usage (the promote job does this):
 *   API_DOCS_URL=https://api.example/docs/json DOCS_USER=… DOCS_PASSWORD=… \
 *     node scripts/check-api-routes.mjs [srcDir]
 *
 * Exit 0: every path has a route. Exit 1: some do not (listed). Exit 2: the
 * document could not be read — which blocks too, since "could not check" is
 * not "checked".
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Server code: `${process.env.HTTP_REQUEST}/…`. Browser code reads the API
// URL at run time (src/env/client.ts): `${await publicApiUrl()}/…`, or goes
// through the same-origin relay, which holds the token: `relayUrl("/…")`.
const CLIENT_URL =
  /`\$\{(?:process\.env\.(?:NEXT_PUBLIC_)?HTTP_REQUEST|await publicApiUrl\(\))\}(\/[^`\s]*)`|relayUrl\(\s*(?:`(\/[^`\s]*)`|\x22(\/[^\x22\s]*)\x22|\x27(\/[^\x27\s]*)\x27)/g;

/** `${x}` is one path segment; the query string is not part of the route. */
function shapeOf(template) {
  return template
    .replace(/\$\{[^}]*\}/g, "SEG")
    .replace(/SEG(?=SEG)/g, "")
    .split("?")[0]
    .replace(/\/+$/, "");
}

/**
 * The API path shapes a set of source files builds, each with where it was
 * first seen.
 *
 * @param {Array<{ path: string, source: string }>} files
 * @returns {Map<string, string>}
 */
export function clientPathShapes(files) {
  const shapes = new Map();

  for (const { path, source } of files) {
    for (const match of source.matchAll(CLIENT_URL)) {
      const shape = shapeOf(match[1] ?? match[2] ?? match[3] ?? match[4] ?? "");

      if (!shape.startsWith("/") || shapes.has(shape)) continue;

      const line = source.slice(0, match.index).split("\n").length;
      shapes.set(shape, `${path}:${line}`);
    }
  }

  return shapes;
}

function routePattern(openApiPath) {
  const path = openApiPath.replace(/\/+$/, "") || "/";

  return new RegExp(
    "^" +
      path
        .split("/")
        .map((segment) =>
          /^\{[^}]+\}$/.test(segment) || segment.startsWith(":")
            ? "[^/]+"
            : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("/") +
      "/?$",
  );
}

/**
 * The called paths no documented route matches, as "shape  (file:line)".
 *
 * Throws on a document without paths: an empty table would pass everything.
 *
 * @param {Map<string, string>} shapes
 * @param {{ paths?: Record<string, unknown> }} document
 * @returns {string[]}
 */
export function missingRoutes(shapes, document) {
  const paths = Object.keys(document?.paths ?? {});

  if (paths.length === 0) {
    throw new Error("The API document lists no paths.");
  }

  const routes = paths.map(routePattern);

  return [...shapes]
    .filter(([shape]) => !routes.some((route) => route.test(shape)))
    .map(([shape, where]) => `${shape}  (${where})`)
    .sort();
}

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);

    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

async function main() {
  const url = process.env.API_DOCS_URL;

  if (!url) {
    console.error("API_DOCS_URL is not set.");
    process.exit(2);
  }

  const root = resolve(process.argv[2] ?? "src");

  const shapes = clientPathShapes(
    sourceFiles(root).map((file) => ({
      path: relative(process.cwd(), file).replace(/\\/g, "/"),
      source: readFileSync(file, "utf8"),
    })),
  );

  const headers = {};

  if (process.env.DOCS_USER && process.env.DOCS_PASSWORD) {
    const credentials = Buffer.from(
      `${process.env.DOCS_USER}:${process.env.DOCS_PASSWORD}`,
    ).toString("base64");

    headers.Authorization = `Basic ${credentials}`;
  }

  let document;

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`The API document answered ${response.status}.`);
      process.exit(2);
    }

    document = await response.json();
  } catch (error) {
    console.error(`The API document could not be read: ${error.message}`);
    process.exit(2);
  }

  let missing;

  try {
    missing = missingRoutes(shapes, document);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }

  if (missing.length > 0) {
    console.error(
      `The production API does not serve ${missing.length} path(s) this build calls.\n` +
        "Promote the API first (and wait for it to converge), then this build:\n",
    );

    for (const line of missing) console.error(`  ${line}`);

    process.exit(1);
  }

  console.log(`All ${shapes.size} API paths this build calls are served.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
