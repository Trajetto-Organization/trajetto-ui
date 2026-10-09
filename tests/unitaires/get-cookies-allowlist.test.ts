import { describe, expect, it, vi } from "vitest";

/**
 * `getCookies` was a Server Action: its id shipped in the public JavaScript
 * and any script on the origin could call it with any name. It handed back
 * the refresh token — HttpOnly so that no script could ever read it — to
 * whoever asked. It is now a server-only helper (no-client-token-read.test.ts
 * proves no browser code reaches it) and still answers only for `tkey`.
 */
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => ({ value: `value-of-${name}` }),
  }),
}));

import { getCookies } from "@/actions/cookies";

describe("getCookies", () => {
  it("never returns the refresh token", async () => {
    await expect(getCookies("rkey")).resolves.toBeUndefined();
  });

  it("never returns an arbitrary cookie either", async () => {
    await expect(getCookies("anything-else")).resolves.toBeUndefined();
  });

  it("still returns the access token to the server code that calls the API", async () => {
    await expect(getCookies("tkey")).resolves.toBe("value-of-tkey");
  });
});
