// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Files through the relay: the exports going down and the imports going up.
 *
 * Both used to be Server Actions. An export was read whole into the Next
 * heap and returned base64 (~4.5x the file per export, a 512 MB heap); an
 * import was sent base64 as an action argument, and Next 14's 1 MB action
 * body cap refused any spreadsheet past ~750 KB that the screen promised up
 * to 6 MB. The relay streams both, keeps the file's name, and carries only
 * the two import writes, only from this origin, only up to the API's own
 * ceiling.
 */
let cookie: string | undefined = "access-token";

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      name === "tkey" && cookie ? { value: cookie } : undefined,
  }),
}));

import { GET, POST } from "@/app/api/relay/[...path]/route";

const fetchMock = vi.fn();
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

beforeEach(() => {
  cookie = "access-token";
  process.env.HTTP_REQUEST = "http://api.internal";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function get(path: string[], search = "") {
  return GET(
    new NextRequest(`http://app.test/api/relay/${path.join("/")}${search}`),
    { params: { path } },
  );
}

function post(
  path: string[],
  body: string,
  headers: Record<string, string> = {},
) {
  return POST(
    new NextRequest(`http://app.test/api/relay/${path.join("/")}`, {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(body)),
        "sec-fetch-site": "same-origin",
        ...headers,
      },
    }),
    { params: { path } },
  );
}

describe("an export through the relay", () => {
  it("streams the file down with its name, type, length and row count", async () => {
    fetchMock.mockResolvedValue(
      new Response("placa\nABC1D23\n", {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="veiculos.csv"',
          "content-length": "14",
          "x-total-records": "1",
        },
      }),
    );

    const response = await get(
      ["vehicle", "export-vehicle"],
      `?format=csv&businessId=${BUSINESS}`,
    );

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe(
      `http://api.internal/vehicle/export-vehicle?format=csv&businessId=${BUSINESS}`,
    );
    expect(init.headers.Authorization).toBe("Bearer access-token");
    // Closing the tab drops the API request too.
    expect(init.signal).toBeInstanceOf(AbortSignal);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="veiculos.csv"',
    );
    expect(response.headers.get("content-type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("content-length")).toBe("14");
    expect(response.headers.get("x-total-records")).toBe("1");
    expect(await response.text()).toBe("placa\nABC1D23\n");
  });

  it("drops the length of a body fetch decoded on the way", async () => {
    fetchMock.mockResolvedValue(
      new Response("x", {
        status: 200,
        headers: { "content-length": "999", "content-encoding": "gzip" },
      }),
    );

    const response = await get(["fuel", "export-fuel"]);

    expect(response.headers.get("content-length")).toBeNull();
  });

  it("passes the API's busy answer through, with its wait", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { code: "EXPORT_BUSY", message: "Aguarde." },
        {
          status: 429,
          headers: { "retry-after": "30", "x-error-code": "EXPORT_BUSY" },
        },
      ),
    );

    const response = await get(["delivery", "export-delivery"]);

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("x-error-code")).toBe("EXPORT_BUSY");
  });

  it.each([
    [["import", "download-template"]],
    [["import", "get-import", "i-1", "business", "b-1"]],
  ])("reads %j for the import dialog", async (path) => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    expect((await get(path)).status).toBe(200);
  });
});

describe("an import through the relay", () => {
  const body = JSON.stringify({
    filename: "carga.xlsx",
    content: "UEsDBA==",
    shipperId: BUSINESS,
  });

  it("streams the JSON body to the API with the session token", async () => {
    fetchMock.mockImplementation(
      async (_url: string, init: RequestInit) =>
        new Response(await new Response(init.body).text(), {
          status: 202,
          headers: { "content-type": "application/json" },
        }),
    );

    const response = await post(
      ["import", "import-spreadsheet", BUSINESS],
      body,
    );

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe(
      `http://api.internal/import/import-spreadsheet/${BUSINESS}`,
    );
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer access-token");
    expect(init.headers["Content-Type"]).toBe("application/json");

    // The API's own answer and status (202 for the async import).
    expect(response.status).toBe(202);
    expect(await response.text()).toBe(body);
  });

  it("carries the XML import too", async () => {
    fetchMock.mockResolvedValue(Response.json({ data: {} }, { status: 200 }));

    const response = await post(["delivery", "import-xml", BUSINESS], "{}");

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `http://api.internal/delivery/import-xml/${BUSINESS}`,
    );
  });

  it.each([
    [["delivery", "create-delivery", BUSINESS]],
    [["user", "logout"]],
    [["vehicle", "export-vehicle"]],
    [["import", "import-spreadsheet", "..", "x"]],
  ])("refuses to write %j", async (path) => {
    const response = await post(path, "{}");

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["another site", { "sec-fetch-site": "cross-site" }],
    ["a sibling subdomain", { "sec-fetch-site": "same-site" }],
    [
      "an old browser on another origin",
      { "sec-fetch-site": "", origin: "https://evil.test" },
    ],
    ["a form post", { "content-type": "application/x-www-form-urlencoded" }],
  ])("refuses %s", async (_label, headers) => {
    const response = await post(
      ["import", "import-spreadsheet", BUSINESS],
      body,
      headers,
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts an old browser's same-origin post by its Origin", async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 200 }));

    const response = await post(
      ["import", "import-spreadsheet", BUSINESS],
      body,
      { "sec-fetch-site": "", origin: "http://app.test", host: "app.test" },
    );

    expect(response.status).toBe(200);
  });

  it("refuses a body past the API's ceiling without reaching it", async () => {
    const response = await post(
      ["import", "import-spreadsheet", BUSINESS],
      "{}",
      { "content-length": String(9 * 1024 * 1024 + 1) },
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    cookie = undefined;

    const response = await post(
      ["import", "import-spreadsheet", BUSINESS],
      body,
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says to check the list when the API could not be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await post(
      ["import", "import-spreadsheet", BUSINESS],
      body,
    );

    expect(response.status).toBe(503);
    expect((await response.json()).message).toMatch(/importações/);
  });
});
