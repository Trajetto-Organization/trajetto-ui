// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every exported function of a "use server" module is an HTTP endpoint: its id
 * ships in the public JavaScript and any browser can call it with any
 * arguments. The web holds no authorization of its own — the API decides who
 * may do what — so an action is safe when it calls the API with the caller's
 * own session (the `tkey` cookie), and the API checks the session, the
 * company and the permission.
 *
 * This walks every "use server" module and fails when one neither reads the
 * session (itself or through a local helper it imports) nor appears in the
 * reviewed list of anonymous actions below, each with why it needs none.
 */
const SRC = resolve(process.cwd(), "src");

const ANONYMOUS_ACTIONS: Record<string, string> = {
  "actions/quote/create-quote/index.ts":
    "public quote form; Turnstile and the API's per-address limit",
  "actions/user/forgot-password-user/index.ts":
    "password recovery has no session by definition; Turnstile and per-address limit",
  "actions/user/new-reset-password-verification/index.ts":
    "the e-mailed token is the authorization (encoded, tests/unitaires/password-reset-token-encoding.test.ts)",
  "actions/user/reset-user-password/index.ts":
    "the e-mailed token is the authorization (encoded, same test)",
  "actions/user/new-verification/index.ts":
    "the e-mailed verification token is the authorization",
  "actions/user/resend-two-factor-code/index.ts":
    "before the session exists; the HttpOnly two-factor challenge cookie is the proof",
  "actions/user/logout-user/index.ts":
    "reads tkey through next/headers only to revoke it; clearing cookies needs no session",
  "actions/validate-turnstile/index.ts":
    "verifies a captcha answer with Cloudflare; touches no data",
  "actions/revalidate/index.ts":
    "revalidates only tags of a closed list (src/lib/revalidation-tags.ts); returns no data",
  "app/acompanhar/[token]/parar/action.ts":
    "public tracking link: the checked token is the authorization",
};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) return files(path);

    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const isServerActionModule = (source: string) =>
  /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use server["']/.test(source);

const LEGACY_DEAD = /[\/]sanity[\/]|[\/]sanity-revalidate[\/]/;

const actionModules = files(SRC)
  .filter((path) => !LEGACY_DEAD.test(path))
  .filter((path) => isServerActionModule(readFileSync(path, "utf8")));

function localImports(path: string, source: string): string[] {
  const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
    (m) => m[1],
  );

  return specifiers.flatMap((specifier) => {
    let base: string;

    if (specifier.startsWith("@/")) base = join(SRC, specifier.slice(2));
    else if (specifier.startsWith("."))
      base = resolve(dirname(path), specifier);
    else return [];

    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      join(base, "index.ts"),
    ]) {
      if (existsSync(candidate) && statSync(candidate).isFile())
        return [candidate];
    }

    return [];
  });
}

/** Reads the session cookie itself, or through a local helper it imports. */
function readsSession(path: string): boolean {
  const source = readFileSync(path, "utf8");
  const SESSION = /["']tkey["']/;

  if (SESSION.test(source)) return true;

  return localImports(path, source).some((helper) => {
    const text = readFileSync(helper, "utf8");

    // `getCookies` is the generic reader; importing it is not reading tkey.
    return (
      !helper.includes(`${join("actions", "cookies")}`) && SESSION.test(text)
    );
  });
}

const key = (path: string) => relative(SRC, path).split("\\").join("/");

describe("server actions", () => {
  it("exist (the scan sees them)", () => {
    expect(actionModules.length).toBeGreaterThan(100);
  });

  it.each(actionModules.map((path) => [key(path), path]))(
    "%s calls the API with the caller's session or is a reviewed anonymous action",
    (name, path) => {
      if (name in ANONYMOUS_ACTIONS) return;

      expect(readsSession(path)).toBe(true);
    },
  );

  it("lists no anonymous action that is gone or no longer a server action", () => {
    const present = new Set(actionModules.map(key));

    for (const name of Object.keys(ANONYMOUS_ACTIONS)) {
      expect(present.has(name), name).toBe(true);
    }
  });

  it("helpers under src/actions that are not actions are server-only", () => {
    // Without "use server" a module is not an endpoint, but a client import
    // would bundle it (and its API calls) for the browser. "server-only"
    // turns that import into a build error. Type-only modules are exempt.
    const helpers = files(join(SRC, "actions"))
      .filter((path) => !isServerActionModule(readFileSync(path, "utf8")))
      .filter((path) => !/types?\.ts$/.test(path));

    expect(helpers.map(key)).toContain("actions/dashboard/index.ts");

    for (const path of helpers) {
      expect(readFileSync(path, "utf8"), key(path)).toMatch(
        /^import ["']server-only["'];/m,
      );
    }

    for (const path of files(join(SRC, "actions")).filter((p) =>
      /types?\.ts$/.test(p),
    )) {
      expect(readFileSync(path, "utf8"), key(path)).not.toMatch(/function|=>/);
    }
  });

  it("never hands a session token back to the browser", () => {
    for (const path of actionModules) {
      const source = readFileSync(path, "utf8");

      // An action's return value is serialized to the caller: never the
      // refresh token (no-client-token-read.test.ts holds the access token).
      expect(source, key(path)).not.toMatch(
        /return\s*\{[^}]*\brefresh_token\b/,
      );
      expect(source, key(path)).not.toMatch(/get\(\s*["']rkey["']\s*\)/);
    }
  });
});
