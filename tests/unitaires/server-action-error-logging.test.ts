// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { logActionError } from "@/lib/log-action-error";

/**
 * OBS-12: 149 of the 150 server actions with a `catch` swallowed what they
 * caught. The user saw "Ocorreu um erro inesperado..." and the web's log
 * stayed empty — an API that stopped answering, a proxy returning HTML
 * instead of JSON, a bug in the action itself: all of it invisible to the
 * operation. Every try/catch of a server action now hands what it caught to
 * one helper, which writes one JSON line to stderr with the action's name.
 *
 * A source scan, like server-client-boundary: it covers every action,
 * including the one somebody adds next week — and the ones that live next to
 * their page instead of under src/actions (the public opt-out does).
 */
const SOURCE = resolve(process.cwd(), "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return files(path);

    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const serverActions = files(SOURCE).filter((path) =>
  /^\s*["']use server["'];?/m.test(readFileSync(path, "utf8")),
);

/**
 * Each `} catch (x) {` / `} catch {` — a try statement's handler, not a
 * promise's `.catch(` — and the first statement inside it.
 */
function handlers(source: string): Array<{ line: number; first: string }> {
  const found: Array<{ line: number; first: string }> = [];

  for (const match of source.matchAll(
    /\}\s*catch\s*(?:\(\s*\w+\s*\))?\s*\{/g,
  )) {
    const start = (match.index ?? 0) + match[0].length;
    const first =
      source
        .slice(start)
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0 && !line.startsWith("//")) ?? "";

    found.push({
      line: source.slice(0, match.index).split("\n").length,
      first,
    });
  }

  return found;
}

describe("every server action", () => {
  it("is found (the scan is not vacuous)", () => {
    expect(serverActions.length).toBeGreaterThan(140);
  });

  it("logs what its try/catch caught, first thing in the handler", () => {
    // A handler that only rethrows swallows nothing: whoever catches it next
    // logs it (getCookies is the case).
    const silent = serverActions.flatMap((path) =>
      handlers(readFileSync(path, "utf8"))
        .filter(
          ({ first }) =>
            !first.startsWith("logActionError(") && !/^throw\b/.test(first),
        )
        .map(({ line }) => `${relative(SOURCE, path)}:${line}`),
    );

    expect(silent, "catch sem logActionError").toEqual([]);
  });

  it("includes the actions outside src/actions", () => {
    expect(
      serverActions.map((path) => relative(SOURCE, path).split("\\").join("/")),
    ).toContain("app/acompanhar/[token]/parar/action.ts");
  });
});

describe("logActionError", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  afterEach(() => {
    spy.mockClear();
  });

  function written(): Record<string, unknown> {
    expect(spy).toHaveBeenCalledTimes(1);

    return JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
  }

  it("writes one JSON line with the action and the error", () => {
    const cause = Object.assign(
      new Error("connect ECONNREFUSED 10.0.0.5:3333"),
      {
        code: "ECONNREFUSED",
      },
    );

    logActionError(
      "vehicle/create-vehicle",
      new TypeError("fetch failed", { cause }),
    );

    expect(written()).toMatchObject({
      level: "error",
      source: "server-action",
      action: "vehicle/create-vehicle",
      name: "TypeError",
      message: "fetch failed",
      cause: "ECONNREFUSED: connect ECONNREFUSED 10.0.0.5:3333",
    });
  });

  it("never writes a token, a query string or an address", () => {
    logActionError(
      "user/reset-user-password",
      new TypeError(
        "Failed to parse URL from undefined/user/reset/password?token=7f3c2a10-segredo Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura ana@exemplo.com",
      ),
    );

    const line = JSON.stringify(written());

    expect(line).not.toContain("7f3c2a10-segredo");
    expect(line).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(line).not.toContain("ana@exemplo.com");
  });

  it("never writes a public link's token, which travels in the PATH", () => {
    // Tracking, opt-out and proof links carry their only authorisation as a
    // path segment (lib/public-token.ts); stripping query strings misses it.
    const token = "a".repeat(32) + "0123456789abcdef0123456789abcdef";

    logActionError(
      "acompanhar/parar",
      new TypeError(
        `Failed to parse URL from undefined/public/track/${token}/opt-out`,
      ),
    );

    expect(JSON.stringify(written())).not.toContain(token);
  });

  it("stays quiet for Next's own control flow (redirect, notFound)", () => {
    logActionError(
      "user/login-user",
      Object.assign(new Error("NEXT_REDIRECT"), {
        digest: "NEXT_REDIRECT;replace;/dashboard;307;",
      }),
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it("copes with something that is not an Error", () => {
    logActionError("x", "texto solto");

    expect(written()).toMatchObject({ action: "x", message: "texto solto" });
  });
});
