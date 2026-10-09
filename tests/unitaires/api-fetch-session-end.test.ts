import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A session that ended mid-page, seen by a Server Action (http-clients,
 * wave 4): 401 AUTH_SESSION_INVALID, 404 USER_NOT_FOUND or a session-level
 * 403 only reached the screen as a toast, and the person stayed on a
 * dashboard where nothing worked. `apiFetch` re-renders the layout in the
 * action's response, so the protected area's own gate (`/user/me`) signs the
 * person out with the reason — or, when the API is only busy, keeps them.
 */
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

import { apiFetch } from "@/lib/api-fetch";

let answer: {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};

beforeEach(() => {
  revalidatePath.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          answer.body === undefined ? "" : JSON.stringify(answer.body),
          {
            status: answer.status,
            headers: answer.headers,
          },
        ),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const AUTHENTICATED = {
  headers: {
    Authorization: "Bearer token-value",
    "Content-Type": "application/json",
  },
};

describe("apiFetch", () => {
  it.each([
    [
      "401 AUTH_SESSION_INVALID",
      {
        status: 401,
        body: { code: "AUTH_SESSION_INVALID", message: "Sessão inválida." },
      },
    ],
    [
      "404 USER_NOT_FOUND (body)",
      {
        status: 404,
        body: { code: "USER_NOT_FOUND", message: "Usuário não encontrado." },
      },
    ],
    [
      "404 USER_NOT_FOUND (header only)",
      { status: 404, body: {}, headers: { "x-error-code": "USER_NOT_FOUND" } },
    ],
    ["403 TENANT_INACTIVE", { status: 403, body: { code: "TENANT_INACTIVE" } }],
    [
      "403 AUTH_ACCESS_REVOKED",
      { status: 403, body: { code: "AUTH_ACCESS_REVOKED" } },
    ],
  ])("re-runs the session gate on %s", async (_, next) => {
    answer = next;

    await apiFetch("http://api.test/vehicle/delete/1", AUTHENTICATED);

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it.each([
    ["404 of a record", { status: 404, body: { code: "VEHICLE_NOT_FOUND" } }],
    [
      "403 of one permission",
      { status: 403, body: { code: "PERMISSION_DENIED" } },
    ],
    ["403 of a module", { status: 403, body: { code: "MODULE_NOT_ENABLED" } }],
    ["409", { status: 409, body: { code: "CONFLICT" } }],
    ["500", { status: 500, body: { code: "INTERNAL_ERROR" } }],
    ["200", { status: 200, body: { message: "ok" } }],
  ])("leaves the session alone on %s", async (_, next) => {
    answer = next;

    await apiFetch("http://api.test/vehicle/delete/1", AUTHENTICATED);

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("never treats an anonymous 401 (wrong password at login) as a session end", async () => {
    answer = { status: 401, body: { code: "AUTH_INVALID_CREDENTIALS" } };

    await apiFetch("http://api.test/user/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("hands the body back unread, so the action still shows the API's message", async () => {
    answer = {
      status: 404,
      body: { code: "USER_NOT_FOUND", message: "Usuário não encontrado." },
    };

    const response = await apiFetch("http://api.test/user/me", AUTHENTICATED);

    expect(await response.json()).toEqual({
      code: "USER_NOT_FOUND",
      message: "Usuário não encontrado.",
    });
  });

  it("does not throw when called outside a Server Action", async () => {
    revalidatePath.mockImplementation(() => {
      throw new Error("Invariant: static generation store missing");
    });
    answer = { status: 401, body: { code: "AUTH_SESSION_INVALID" } };

    await expect(
      apiFetch("http://api.test/x", AUTHENTICATED),
    ).resolves.toBeInstanceOf(Response);
  });
});

describe("every Server Action calls the API through apiFetch", () => {
  const ACTIONS = resolve(__dirname, "../../src/actions");

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);

      return statSync(full).isDirectory()
        ? walk(full)
        : /\.tsx?$/.test(entry)
          ? [full]
          : [];
    });

  const offenders = walk(ACTIONS)
    .filter((file) => /\bawait\s+fetch\(/.test(readFileSync(file, "utf8")))
    .map((file) => relative(ACTIONS, file).split("\\").join("/"));

  it("has no bare fetch left (a new action would miss the session end)", () => {
    expect(offenders).toEqual([]);
  });
});
