// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

/**
 * A session-level 403 from the API, read by the server gate and by the
 * middleware's token refresh.
 *
 * The gate matched the message: only "acesso foi revogado" and "motorista
 * está inativo" redirected. A deactivated company, a removed profile or an
 * inactive branch returned without a redirect, and the protected layout drew
 * the connection-lost screen, which refreshed in a loop until the access
 * token expired — and then the middleware said "sessão expirou". Neither
 * place ever said why.
 */
const redirects = vi.hoisted(() => [] as string[]);

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    redirects.push(to);
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));

import { handleUserResponseError } from "@/app/(protected)/_components/layout/protected-provider/security-checks";
import middleware from "@/middleware";

// A refresh token of its own per request: the middleware shares one renewal
// among requests racing on the same refresh token and keeps its answer for
// a few seconds, and each case here is a session of its own.
let session = 0;
const nextSession = () => (session += 1);

function answer(status: number, body: unknown): Response {
  return new Response(body === undefined ? "" : JSON.stringify(body), {
    status,
  });
}

/** Where the gate sent the user, or null when it returned without judging. */
async function gateOutcome(response: Response): Promise<string | null> {
  redirects.length = 0;

  try {
    await handleUserResponseError(response);
  } catch (error) {
    if (!String(error).includes("NEXT_REDIRECT")) throw error;
  }

  return redirects[0] ?? null;
}

describe("the server gate on a refused /user/me", () => {
  it.each([
    ["AUTH_BUSINESS_INACTIVE", "business_inactive"],
    ["TENANT_INACTIVE", "business_inactive"],
    ["AUTH_PROFILE_NOT_CONFIGURED", "no_user_permission"],
    ["AUTH_BRANCH_INACTIVE", "branch_inactive"],
    ["AUTH_DRIVER_TENANT_MISMATCH", "access_denied"],
    ["AUTH_BUSINESS_REQUIRED", "access_denied"],
    ["PERMISSION_DENIED", "access_denied"],
  ])("logs out on 403 %s as %s", async (code, reason) => {
    const target = await gateOutcome(
      answer(403, { code, message: "Qualquer texto." }),
    );

    expect(target).toBe(`/login?error=${reason}&force_logout=true`);
  });

  it("reads the code, not the copy", async () => {
    // The API's wording changed; the code did not.
    expect(
      await gateOutcome(
        answer(403, { code: "AUTH_ACCESS_REVOKED", message: "Bloqueado." }),
      ),
    ).toBe("/login?error=user_revoked&force_logout=true");

    expect(
      await gateOutcome(
        answer(403, { code: "AUTH_DRIVER_INACTIVE", message: "Indisponível." }),
      ),
    ).toBe("/login?error=driver_inactive&force_logout=true");
  });

  it("logs out on a 403 with no readable body", async () => {
    expect(await gateOutcome(new Response("<html>", { status: 403 }))).toBe(
      "/login?error=access_denied&force_logout=true",
    );
  });

  it("does not let a code named after an Object member resolve", async () => {
    expect(await gateOutcome(answer(403, { code: "constructor" }))).toBe(
      "/login?error=access_denied&force_logout=true",
    );
  });

  it("keeps the other verdicts it already had", async () => {
    expect(await gateOutcome(answer(401, {}))).toBe(
      "/login?error=session_expired&force_logout=true",
    );
    expect(await gateOutcome(answer(404, {}))).toBe(
      "/login?error=access_denied&force_logout=true",
    );
  });

  it.each([500, 502, 503, 429])(
    "does not judge the session on %s (connection screen)",
    async (status) => {
      expect(await gateOutcome(answer(status, { code: "X" }))).toBeNull();
    },
  );
});

// ---------------------------------------------------------------------------
// The middleware's token refresh
// ---------------------------------------------------------------------------

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

const fetchMock = vi.fn();

function expiredSessionRequest(): NextRequest {
  const expiredAccess = jwt({
    role: "BUSINESS_ADMIN",
    exp: Math.floor(Date.now() / 1000) - 60,
  });

  return new NextRequest("http://app.test/dashboard", {
    headers: {
      cookie: `tkey=${expiredAccess}; rkey=refresh-token-${nextSession()}`,
    },
  });
}

describe("a refresh the API refused with a session-level 403", () => {
  beforeEach(() => {
    process.env.HTTP_REQUEST = "http://api.test";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["AUTH_BUSINESS_INACTIVE", "business_inactive"],
    ["AUTH_ACCESS_REVOKED", "user_revoked"],
    ["AUTH_DRIVER_INACTIVE", "driver_inactive"],
    ["AUTH_PROFILE_NOT_CONFIGURED", "no_user_permission"],
    ["AUTH_BRANCH_INACTIVE", "branch_inactive"],
  ])("says %s as %s, not as an expired session", async (code, reason) => {
    fetchMock.mockResolvedValue(answer(403, { code, message: "x" }));

    const response = await middleware(expiredSessionRequest());
    const location = new URL(
      response.headers.get("location") ?? "",
      "http://app.test",
    );

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("reason")).toBe(reason);
  });

  it("still says an invalidated refresh token as an expired session", async () => {
    fetchMock.mockResolvedValue(
      answer(401, { code: "AUTH_SESSION_INVALIDATED" }),
    );

    const response = await middleware(expiredSessionRequest());
    const location = new URL(
      response.headers.get("location") ?? "",
      "http://app.test",
    );

    expect(location.searchParams.get("reason")).toBe("session_expired");
  });
});
