// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: () => new Headers() }));

import { stopDeliveryMessages } from "@/app/acompanhar/[token]/parar/action";
import { trackDelivery, verifyProof } from "@/lib/public-api";
import { isPublicToken } from "@/lib/public-token";
import { readBusinessIdParam } from "@/lib/business-id-param";

/**
 * Values from the browser that end up as a SEGMENT of an API path.
 *
 * A server action takes whatever arguments its caller sends — its id is in
 * the public bundle of the page that uses it. The opt-out action put the token
 * straight into `/public/track/${token}/opt-out`, and URL parsing resolves
 * `..`: `../../user/session?` made this server POST to /user/session, from its
 * own address and without the Turnstile the login page requires, spending the
 * login rate-limit bucket every web user shares.
 *
 * The same shape on the logged-in side: `?businessId=` from the address bar
 * went into request paths made with the VICTIM's token, so a crafted link
 * chose which API path somebody else's session would call.
 */
const HEX = "a".repeat(64);
const UUID = "0190f3c2-7d1e-7a44-9c1b-2f3e4d5c6b7a";

const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function requestedPath(): string {
  const [url] = fetchMock.mock.calls[0] as unknown as [string];
  return new URL(url).pathname;
}

describe("the opt-out action", () => {
  it.each(["../../user/session?", "../x", `${HEX}/../../user`, "A".repeat(64)])(
    "never sends %j to the API",
    async (token) => {
      const reached = await stopDeliveryMessages(token);

      expect(fetchMock).not.toHaveBeenCalled();

      // The same answer the API gives a malformed token: nothing to do, and
      // nothing the person could retry their way out of.
      expect(reached).toBe(true);
    },
  );

  it("sends a real token to its own opt-out path", async () => {
    await stopDeliveryMessages(HEX);

    expect(requestedPath()).toBe(`/public/track/${HEX}/opt-out`);
  });
});

describe("the public pages' lookups", () => {
  it.each([trackDelivery, verifyProof])(
    "answer a malformed token as not found without asking the API",
    async (lookup) => {
      const result = await lookup("../../user/session?");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, status: 400, data: null });
    },
  );

  it("look a real token up where it belongs", async () => {
    await trackDelivery(HEX);
    expect(requestedPath()).toBe(`/public/track/${HEX}`);

    fetchMock.mockClear();

    await verifyProof(HEX);
    expect(requestedPath()).toBe(`/public/verify-proof/${HEX}`);
  });
});

describe("isPublicToken", () => {
  it("is the API's shape: 64 lowercase hex characters", () => {
    expect(isPublicToken(HEX)).toBe(true);
    expect(isPublicToken("A".repeat(64))).toBe(false);
    expect(isPublicToken("a".repeat(63))).toBe(false);
    expect(isPublicToken(undefined)).toBe(false);
  });
});

describe("the company in the address bar", () => {
  it.each(["../../user/session?", "../x", `${UUID}/../x`, "", null, undefined])(
    "is ignored when it is not a company id (%j)",
    (value) => {
      expect(readBusinessIdParam(value)).toBeUndefined();
    },
  );

  it("is taken when it is one", () => {
    expect(readBusinessIdParam(UUID)).toBe(UUID);
    expect(readBusinessIdParam(UUID.toUpperCase())).toBe(UUID.toUpperCase());
  });

  it.each([
    "src/features/deliveries/hooks/use-deliveries-business-id.ts",
    "src/features/routes/hooks/use-routes-business-id.ts",
    "src/features/integrations/hooks/use-integrations-business-id.ts",
    "src/features/control-tower/content/index.tsx",
    "src/app/(protected)/_components/shared/limits/limits-content/hooks/index.ts",
    "src/app/(protected)/_components/kanban/board-provider/index.tsx",
    "src/app/(protected)/admin/kanban/page.tsx",
    "src/features/deliveries/content/index.tsx",
    "src/features/routes/content/index.tsx",
  ])("goes through readBusinessIdParam in %s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).toContain("readBusinessIdParam(");

    // The raw reads that fed a path segment.
    expect(source).not.toMatch(/\.get\("businessId"\)\s*\|\|/);
    expect(source).not.toMatch(/=\s*searchParams\.businessId;/);
    expect(source).not.toMatch(/businessId=\{searchParams\.businessId\}/);
  });
});
