import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The logout Server Action's answer, which the "Sair" button reads to choose
 * its way out (see logout-clears-session.test.ts).
 *
 * It used to end in `redirect()`, which reaches the caller as `undefined` —
 * the same answer a tab from an older build gets for an action id the server
 * no longer knows. A success must be an answer of its own.
 */
const clearCookies = vi.fn(async () => undefined);
const redirect = vi.fn();

vi.mock("@/actions/user/user-authentication", () => ({
  handleLogOutUser: () => clearCookies(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

vi.mock("@/lib/log-action-error", () => ({ logActionError: vi.fn() }));

import { handleLogout } from "@/actions/user/logout-user";

beforeEach(() => {
  clearCookies.mockReset();
  redirect.mockClear();
});

describe("the logout action", () => {
  it("says it logged out once the cookies are deleted, without a soft redirect", async () => {
    clearCookies.mockResolvedValue(undefined);

    await expect(handleLogout()).resolves.toEqual({ loggedOut: true });

    expect(clearCookies).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("says why when the cookies could not be deleted", async () => {
    clearCookies.mockRejectedValue(new Error("boom"));

    const result = await handleLogout();

    expect(result.loggedOut).toBeUndefined();
    expect(result.logoutError).toMatch(/erro inesperado/i);
  });
});
