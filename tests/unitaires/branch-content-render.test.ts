import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BranchContent } from "@/features/branch/content";
import { BRANCH_LIST_TAGS } from "@/features/branch/lib/list-tags";

/**
 * The server content, called for real with the network stubbed (the API is
 * not what is proven here; the request the page builds and the element it
 * returns are).
 */
// The components compile with the classic JSX runtime under vitest.
(globalThis as { React?: typeof React }).React = React;

const COMPANY = "018fed00-0000-7000-8000-00000000000a";
const OTHER = "018fed00-0000-7000-8000-00000000000b";

function ndjson(lines: unknown[]): Response {
  return new Response(
    lines.map((line) => JSON.stringify(line)).join("\n") + "\n",
    {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Filiais server content", () => {
  it("asks the API for the picked company's list, tagged for revalidation", async () => {
    const fetchMock = vi.fn(async () =>
      ndjson([{ meta: { total: 0, page: 1, pageSize: 10 } }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await BranchContent({
      mode: "admin",
      searchParams: { businessId: COMPANY, search: "centro" },
      token: "t",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { next: { tags: string[] } },
    ];

    expect(url).toContain("/branch/list-branch?");
    expect(new URL(url, "http://x").searchParams.get("businessId")).toBe(
      COMPANY,
    );
    expect(init.next.tags).toEqual([...BRANCH_LIST_TAGS]);
  });

  it("keys the screen by the company on /admin, so a switch remounts the toolbar (decision 2.6)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjson([{ meta: { total: 0, page: 1, pageSize: 10 } }]),
      ),
    );

    const first = await BranchContent({
      mode: "admin",
      searchParams: { businessId: COMPANY },
      token: "t",
    });
    const second = await BranchContent({
      mode: "admin",
      searchParams: { businessId: OTHER },
      token: "t",
    });

    expect(first.key).toBe(COMPANY);
    expect(second.key).toBe(OTHER);
  });

  it("keeps one stable key on /dashboard, where the company is the session's", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjson([{ meta: { total: 0, page: 1, pageSize: 10 } }]),
      ),
    );

    const element = await BranchContent({
      mode: "dashboard",
      searchParams: { businessId: OTHER },
      token: "t",
    });

    expect(element.key).toBe("session");
  });
});
