import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readDeliveryList } from "@/features/deliveries/content/list-read";

/**
 * The server read of the Entregas catalogs answered in the browser (spec
 * §13): which requests reach the API, with which params, for which URL. The
 * company goes in every request; a facet never reaches the complete read.
 */
const COMPANY = "018f0000-0000-7000-8000-00000000c0de";

const requests: URL[] = [];

function ndjson(meta: unknown, rows: unknown[]): Response {
  return new Response(
    [JSON.stringify({ meta }), ...rows.map((row) => JSON.stringify(row))].join(
      "\n",
    ) + "\n",
    { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
  );
}

const typeRow = (n: number) => ({
  id: `0190${String(n).padStart(4, "0")}-0000-7000-8000-00000000000a`,
  is_active: true,
  blocks_delivery: false,
  requires_photo: false,
  category: "NOT_DELIVERED",
  created_at: new Date(Date.UTC(2026, 9, 1, n)).toISOString(),
  updated_at: new Date(Date.UTC(2026, 9, 1, n)).toISOString(),
});

let answer: (url: URL) => Response;

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  requests.length = 0;

  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(String(input));

    requests.push(url);

    return answer(url);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a small catalog comes back whole", () => {
  it("one request: page 1 of 100, the search, the sort and the company, no facet", async () => {
    answer = () =>
      ndjson({ total: 3, page: 1, pageSize: 100, searchMeta: { total: 3 } }, [
        typeRow(1),
        typeRow(2),
        typeRow(3),
      ]);

    const read = await readDeliveryList({
      section: "occurrence-types",
      token: "t",
      businessId: COMPANY,
      searchParams: {
        tab: "occurrence-types",
        search: "ent",
        sort: "name",
        order: "asc",
        page: "2",
        pageSize: "20",
      },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].pathname).toBe("/occurrence-type/list-occurrence-type");
    expect(Object.fromEntries(requests[0].searchParams)).toEqual({
      page: "1",
      pageSize: "100",
      search: "ent",
      businessId: COMPANY,
      sort: "name",
      order: "asc",
    });
    expect(read.complete).toBeDefined();
    expect(read.rows).toHaveLength(3);
    // The URL's page: the browser pages the whole set.
    expect(read.meta).toEqual({ total: 3, page: 2, pageSize: 20 });
  });

  it("with a filter in the URL: the server's answer, then the complete read, both for the company", async () => {
    answer = (url) =>
      url.searchParams.get("status")
        ? ndjson(
            {
              total: 1,
              page: 1,
              pageSize: 10,
              searchMeta: {
                facets: {
                  status: [
                    { value: "active", count: 2 },
                    { value: "inactive", count: 1 },
                  ],
                },
              },
            },
            [typeRow(3)],
          )
        : ndjson({ total: 3, page: 1, pageSize: 100 }, [
            typeRow(1),
            typeRow(2),
            typeRow(3),
          ]);

    const read = await readDeliveryList({
      section: "occurrence-types",
      token: "t",
      businessId: COMPANY,
      searchParams: { tab: "occurrence-types", status: "inactive" },
    });

    expect(requests.map((url) => url.searchParams.get("status"))).toEqual([
      "inactive",
      null,
    ]);
    expect(
      requests.every((url) => url.searchParams.get("businessId") === COMPANY),
    ).toBe(true);
    expect(read.complete).toBeDefined();
    expect(read.rows).toHaveLength(3);
  });

  it("a big catalog with a filter: one request, the server's page (no complete read)", async () => {
    answer = () =>
      ndjson(
        {
          total: 140,
          page: 1,
          pageSize: 10,
          searchMeta: {
            total: 400,
            facets: {
              status: [
                { value: "active", count: 260 },
                { value: "inactive", count: 140 },
              ],
            },
          },
        },
        [typeRow(1)],
      );

    const read = await readDeliveryList({
      section: "shippers",
      token: "t",
      businessId: undefined,
      searchParams: { tab: "shippers", status: "inactive" },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].searchParams.get("pageSize")).toBe("10");
    expect(read.complete).toBeUndefined();
  });

  it("a refusal stays a refusal (403 and 401 as before)", async () => {
    answer = () =>
      new Response(
        JSON.stringify({ code: "PERMISSION_DENIED", message: "Sem permissão" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );

    const refused = await readDeliveryList({
      section: "status-change-reasons",
      token: "t",
      businessId: COMPANY,
      searchParams: { tab: "status-change-reasons" },
    });

    expect(requests).toHaveLength(1);
    expect(refused.refusal).not.toBeNull();
    expect(refused.complete).toBeUndefined();

    answer = () => new Response("", { status: 401 });

    const expired = await readDeliveryList({
      section: "status-change-reasons",
      token: "t",
      businessId: COMPANY,
      searchParams: { tab: "status-change-reasons", status: "active" },
    });

    expect(expired.unauthorized).toBe(true);
  });
});

describe("the other lists keep their own read", () => {
  it("Importações and Entregas: one request with the URL's page and facets", async () => {
    answer = () => ndjson({ total: 0, page: 2, pageSize: 10 }, []);

    for (const section of ["imports", "deliveries"] as const) {
      requests.length = 0;

      const read = await readDeliveryList({
        section,
        token: "t",
        businessId: COMPANY,
        searchParams: { tab: section, page: "2", status: "COMPLETED" },
      });

      expect(requests).toHaveLength(1);
      expect(requests[0].searchParams.get("page")).toBe("2");
      expect(requests[0].searchParams.get("pageSize")).toBe("10");
      expect(read.complete).toBeUndefined();
    }
  });
});
