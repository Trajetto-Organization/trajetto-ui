import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BranchContent } from "@/features/branch/content";
import { BranchListSection } from "@/features/branch/content/list-section";

/**
 * Filiais answered in the browser when the company's whole set fits in one
 * read (spec §13): the server content makes that read and hands the rows,
 * with the read's key, to the screen's list section.
 */
(globalThis as { React?: typeof React }).React = React;

const COMPANY = "018fed00-0000-7000-8000-00000000000a";

const branch = (n: number, uf: string) => ({
  id: `0190${String(n).padStart(4, "0")}-0000-7000-8000-00000000000a`,
  uf,
  is_active: n % 2 === 0,
  created_at: new Date(Date.UTC(2026, 9, 1, n)).toISOString(),
  updated_at: new Date(Date.UTC(2026, 9, 1, n)).toISOString(),
});

function ndjson(meta: unknown, rows: unknown[]): Response {
  return new Response(
    [JSON.stringify({ meta }), ...rows.map((row) => JSON.stringify(row))].join(
      "\n",
    ) + "\n",
    { status: 200 },
  );
}

function sectionOf(element: React.ReactElement) {
  const children = React.Children.toArray(
    (element.props as { children: React.ReactNode }).children,
  ) as React.ReactElement[];

  return children.find((child) => child.type === BranchListSection)!;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Filiais complete read", () => {
  it("one read of the company's whole set; the section receives it with its key", async () => {
    const fetchMock = vi.fn(async () =>
      ndjson({ total: 2, page: 1, pageSize: 100, searchMeta: { total: 2 } }, [
        branch(1, "SP"),
        branch(2, "RJ"),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const element = await BranchContent({
      mode: "admin",
      searchParams: { businessId: COMPANY, page: "1", pageSize: "10" },
      token: "t",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const url = new URL(
      String((fetchMock.mock.calls[0] as unknown[])[0]),
      "http://x",
    );

    expect(url.searchParams.get("pageSize")).toBe("100");
    expect(url.searchParams.get("businessId")).toBe(COMPANY);

    const section = sectionOf(element);

    expect(section.props.complete).toEqual(expect.any(String));
    expect(section.props.data).toHaveLength(2);
    expect(section.props.meta).toEqual({ total: 2, page: 1, pageSize: 10 });
  });

  it("a filter in the URL of a big company: the server's page, no second read", async () => {
    const fetchMock = vi.fn(async () =>
      ndjson(
        {
          total: 130,
          page: 1,
          pageSize: 10,
          searchMeta: {
            total: 130,
            facets: {
              status: [
                { value: "active", count: 130 },
                { value: "inactive", count: 70 },
              ],
            },
          },
        },
        [branch(1, "SP")],
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const element = await BranchContent({
      mode: "admin",
      searchParams: { businessId: COMPANY, uf: "SP" },
      token: "t",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sectionOf(element).props.complete).toBeUndefined();
  });
});
