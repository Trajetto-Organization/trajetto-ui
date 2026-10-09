// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The same-origin relay that replaced the browser's direct, token-bearing
 * API reads. It must attach the session on the server, pass the API's answer
 * through untouched, and refuse to be anything wider than its closed list.
 */
let cookie: string | undefined = "access-token";

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      name === "tkey" && cookie ? { value: cookie } : undefined,
  }),
}));

import { GET } from "@/app/api/relay/[...path]/route";
import { isRelayPath, relayUrl } from "@/lib/api-relay-paths";

const fetchMock = vi.fn();

function call(path: string[], search = "") {
  const request = new NextRequest(
    `http://localhost/api/relay/${path.join("/")}${search}`,
  );

  return GET(request, { params: { path } });
}

beforeEach(() => {
  cookie = "access-token";
  process.env.HTTP_REQUEST = "http://api.internal";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const NDJSON = '{"meta":{}}\n{"id":"1"}\n';

describe("GET /api/relay/[...path]", () => {
  it("forwards a listed read with the session token, query included", async () => {
    fetchMock.mockResolvedValue(
      new Response(NDJSON, {
        status: 200,
        headers: {
          "content-type": "application/x-ndjson",
          "set-cookie": "x=1",
        },
      }),
    );

    const response = await call(
      ["vehicle", "search-vehicle-business"],
      "?limit=10&search=abc%20d",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe(
      "http://api.internal/vehicle/search-vehicle-business?limit=10&search=abc%20d",
    );
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer access-token");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/x-ndjson");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).toBe(NDJSON);
  });

  it("passes the API's refusal through, status and code", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { code: "PERMISSION_DENIED", message: "Sem permissão." },
        { status: 403, headers: { "x-error-code": "PERMISSION_DENIED" } },
      ),
    );

    const response = await call(["user", "me"]);

    expect(response.status).toBe(403);
    expect(response.headers.get("x-error-code")).toBe("PERMISSION_DENIED");
    expect(await response.json()).toEqual({
      code: "PERMISSION_DENIED",
      message: "Sem permissão.",
    });
  });

  it.each([
    [["user", "list-users"]],
    [["user", "logout"]],
    [["business", "get-ai-usage", "..", "..", "user", "me"]],
    [["vehicle", "get-vehicle", "a/b", "business", "c"]],
    [[]],
  ])("refuses %j without reaching the API", async (path) => {
    const response = await call(path);

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 401 without a session, without reaching the API", async () => {
    cookie = undefined;

    const response = await call(["user", "me"]);

    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("AUTH_TOKEN_MISSING");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 503 when the API does not answer (an outage, not a verdict)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await call(["notification", "stream"]);

    expect(response.status).toBe(503);
  });
});

describe("relay paths", () => {
  it("cover every browser read and nothing that writes", () => {
    for (const path of [
      "/user/me",
      "/notification/stream",
      "/dashboard/trends",
      "/kanban/list/0190-abc",
      "/permission/list-by-profile/p-1",
      "/business/get-ai-usage/b-1",
      "/fuel/get-previous-fuel/v-1",
      "/vehicle/get-vehicle/v-1/business/b-1",
      "/fuel/search-fuel-by-vehicle/v-1",
      "/service-order/search-service-order-by-vehicle/v-1",
      "/shipper/search-shipper-business",
      "/traffic-violation/search-traffic-violation-codes",
    ]) {
      expect(isRelayPath(path), path).toBe(true);
    }

    for (const path of [
      "/user/logout",
      "/user/socket-ticket",
      "/delivery/create-delivery",
      "/user/me/x",
    ]) {
      expect(isRelayPath(path), path).toBe(false);
    }
  });

  it("builds same-origin URLs", () => {
    expect(relayUrl("/user/me")).toBe("/api/relay/user/me");
    expect(
      relayUrl("/dashboard/trends", new URLSearchParams({ period: "7d" })),
    ).toBe("/api/relay/dashboard/trends?period=7d");
  });
});
