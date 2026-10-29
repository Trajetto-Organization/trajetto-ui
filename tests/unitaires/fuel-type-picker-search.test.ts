import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClientProvider } from "react-query";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

/**
 * The pickers read through the same-origin relay (the page holds no token):
 * a request that still went straight to the API is a regression. Returns the
 * URL as the API will see it.
 */
function relayed(input: unknown): URL {
  const raw = String(input);

  if (!raw.startsWith("/api/relay/")) throw new Error(`not relayed: ${raw}`);

  const url = new URL(raw, "http://web.test");

  url.pathname = url.pathname.slice("/api/relay".length);

  return url;
}

import { queryClientProps } from "@/lib/query-client-props";
import { SearchFuelType } from "@/app/(protected)/_components/shared/searches/search-fuel-type";
import { seedPublicConfig } from "./helpers/public-config";

/**
 * The fuel type picker of the refueling wizard sends what the person types
 * to the API (FLEET-SEARCH-1): a fuel type outside the loaded page could not
 * be found, because the input only narrowed the rows already fetched. And
 * the server's answer is not re-filtered by cmdk, which only sees the label.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

const requests: URL[] = [];
let serverRows: Array<{ id: string; description: string }> = [];

function ndjsonResponse(lines: unknown[]) {
  const bytes = new TextEncoder().encode(
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
  );

  let sent = false;

  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: bytes };
        },
      }),
    },
  };
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

beforeEach(() => {
  seedPublicConfig({ apiUrl: "http://api.test" });
  requests.length = 0;
  serverRows = [
    { id: "f1", description: "Diesel" },
    { id: "f2", description: "Gasolina" },
  ];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = relayed(input);
      requests.push(url);

      // The server matches on what it knows, beyond the label on screen.
      const term = url.searchParams.get("search");
      const rows =
        term === "s10" ? [{ id: "f1", description: "Diesel" }] : serverRows;

      return ndjsonResponse([
        { meta: { searchMeta: { nextCursor: null, hasMore: false } } },
        ...rows,
      ]);
    }),
  );
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = null;
  queryClientProps.clear();
  vi.unstubAllGlobals();
});

describe("SearchFuelType", () => {
  it("asks the API for the typed term and shows its answer as is", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(
        createElement(
          QueryClientProvider,
          { client: queryClientProps },
          createElement(SearchFuelType, {
            businessId: BUSINESS,
            searchFuelTypeInputValue: "",
            handleUpdateSearchFuelTypeInputValue: () => undefined,
          }),
        ),
      );
    });

    await act(async () => {
      await sleep(20);
    });

    const input = host.querySelector<HTMLInputElement>("input")!;
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    await act(async () => {
      setValue.call(input, "s10");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // Past the picker's debounce.
    await act(async () => {
      await sleep(450);
    });

    const searched = requests.find(
      (url) => url.searchParams.get("search") === "s10",
    );

    expect(searched?.pathname).toBe("/fuel-type/search-fuel-type-business");
    expect(searched?.searchParams.get("businessId")).toBe(BUSINESS);

    // "Diesel" does not contain "s10", yet it is the server's match: shown.
    expect(host.textContent).toContain("Diesel");
    expect(host.textContent).not.toContain("Gasolina");
  });
});
