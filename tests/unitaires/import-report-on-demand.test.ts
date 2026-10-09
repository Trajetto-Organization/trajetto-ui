import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The upload history, without every upload's report in it (PG-15).
 *
 * Each import keeps a report with one entry per spreadsheet line, and the
 * history listing returned all of them — a page of big days was megabytes the
 * API held in memory to draw four numbers per row. The listing is now asked
 * for the counters only, and the report of ONE upload is fetched when the
 * operator opens it.
 */
vi.mock("@/actions/cookies", () => ({
  getCookies: vi.fn(async (name: string) =>
    name === "tkey" ? "tok-abc" : undefined,
  ),
}));

const calls: Array<{ url: string; init?: RequestInit }> = [];

let answer: () => Response;

beforeEach(() => {
  calls.length = 0;

  vi.stubEnv("HTTP_REQUEST", "https://api.exemplo");

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return answer();
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const REPORT = {
  imported: 1,
  duplicated: 0,
  invalid: 1,
  unknownHeaders: ["coluna"],
  rows: [
    {
      line: 2,
      outcome: "imported",
      recipient_name: "Ana",
      reference: "P-1",
      message: null,
    },
    {
      line: 3,
      outcome: "invalid",
      recipient_name: null,
      reference: null,
      message: "CEP inválido",
    },
  ],
  routes: [],
};

describe("the history listing", () => {
  it("asks for the counters only", async () => {
    answer = () =>
      new Response(
        `${JSON.stringify({ meta: { total: 0, page: 1, pageSize: 10 } })}\n`,
        {
          status: 200,
          headers: { "content-type": "application/x-ndjson" },
        },
      );

    const { listImports } = await import("@/actions/import/list-imports");

    await listImports("biz-1", 1, 10);

    const url = new URL(calls[0].url);

    expect(url.pathname).toBe("/import/list-imports");
    expect(url.searchParams.get("includeReport")).toBe("false");
  });
});

describe("the report of one upload", () => {
  it("is read from its own endpoint, with the session's token", async () => {
    answer = () =>
      new Response(JSON.stringify({ data: { id: "imp-1", report: REPORT } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    const { getImport } = await import("@/actions/import/get-import");

    const result = await getImport("imp-1", "biz-1");

    expect(calls[0].url).toBe(
      "https://api.exemplo/import/get-import/imp-1/business/biz-1",
    );
    expect(calls[0].init?.method).toBe("GET");
    expect(
      (calls[0].init?.headers as Record<string, string>).Authorization,
    ).toBe("Bearer tok-abc");

    expect(result).toMatchObject({
      success: true,
      data: { id: "imp-1", report: REPORT },
    });
  });

  it("says in Portuguese when it cannot be read", async () => {
    answer = () =>
      new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });

    const { getImport } = await import("@/actions/import/get-import");

    const result = await getImport("imp-1", "biz-1");

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Não foi possível carregar o relatório desta importação.",
    );
  });

  it("passes the API's own message through when there is one", async () => {
    answer = () =>
      new Response(JSON.stringify({ message: "Importação não encontrada!" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });

    const { getImport } = await import("@/actions/import/get-import");

    const result = await getImport("imp-1", "biz-1");

    expect(result).toEqual({
      success: false,
      message: "Importação não encontrada!",
    });
  });

  it("does not call the API without a session", async () => {
    const { getCookies } = await import("@/actions/cookies");
    vi.mocked(getCookies).mockResolvedValueOnce(undefined);

    const { getImport } = await import("@/actions/import/get-import");

    const result = await getImport("imp-1", "biz-1");

    expect(result.success).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
