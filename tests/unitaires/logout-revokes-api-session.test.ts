// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Sair" on the web only deleted the two cookies. The API keeps a refresh
 * token family per session and revokes it on POST /user/logout, which the web
 * never called: a refresh token copied before the logout kept working until
 * it expired. The action now asks the API first, and still clears the
 * cookies when the API cannot be reached.
 */
const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      jar.has(name) ? { value: jar.get(name) } : undefined,
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { handleLogout } from "@/actions/user/logout-user";

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.HTTP_REQUEST = "https://api.trajetto.test";
  jar.clear();
  jar.set("tkey", "access-token");
  jar.set("rkey", "refresh-token");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("handleLogout", () => {
  it("revokes the session on the API with the session's own token", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(handleLogout()).resolves.toEqual({ loggedOut: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe("https://api.trajetto.test/user/logout");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("clears the cookies even when the API is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(handleLogout()).resolves.toEqual({ loggedOut: true });

    expect(jar.has("tkey")).toBe(false);
    expect(jar.has("rkey")).toBe(false);
  });

  it("clears the cookies when the API refuses an expired token", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    await handleLogout();

    expect(jar.size).toBe(0);
  });

  it("calls nothing without a session", async () => {
    jar.clear();

    await expect(handleLogout()).resolves.toEqual({ loggedOut: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
