import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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
import { SearchDriver } from "@/app/(protected)/_components/shared/searches/search-driver";
import { seedPublicConfig } from "./helpers/public-config";

/**
 * The driver picker used by the user and vehicle forms (FLEET-SEARCH-1).
 *
 * It only narrowed the ten rows it had loaded, and cmdk filtered the list by
 * the item text again: a driver past the first page could not be found, and
 * one found by the CNH digits was hidden because the digits are not in the
 * item text. The typed term now goes to the API, whose answer is shown as it
 * comes.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

type Row = { id: string; name: string; cnh?: string };

const requests: URL[] = [];
let answer: (url: URL) => Row[] = () => [];

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

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  // The config compiles JSX with the classic runtime.
  (globalThis as { React?: typeof React }).React = React;
  seedPublicConfig({ apiUrl: "http://api.test" });
});

beforeEach(() => {
  requests.length = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = relayed(input);
      requests.push(url);

      return ndjsonResponse([
        { meta: { searchMeta: { nextCursor: null, hasMore: false } } },
        ...answer(url),
      ]);
    }),
  );
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();

  root = null;
  host = null;

  queryClientProps.clear();
  vi.unstubAllGlobals();
});

async function settle(ms: number) {
  await act(async () => {
    await new Promise((done) => setTimeout(done, ms));
  });
}

async function render() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(SearchDriver, {
          businessId: BUSINESS,
          handleUpdateSearchDriverInputValue: () => undefined,
        }),
      ),
    );
  });

  await settle(50);
}

async function type(text: string) {
  const input = host!.querySelector<HTMLInputElement>("input")!;

  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    setValue.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("SearchDriver", () => {
  it("sends the typed term to the API", async () => {
    answer = () => [{ id: "d1", name: "Ana Lima", cnh: "11111111111" }];

    await render();
    await type("bruno");
    await settle(450);

    const searched = requests.map((url) => url.searchParams.get("search"));

    expect(searched).toContain("bruno");
    expect(
      requests.every(
        (url) => url.pathname === "/driver/search-driver-business",
      ),
    ).toBe(true);
  });

  it("shows the server's match even when the term is not in the item's text", async () => {
    // Found by the CNH digits: "3333" is nowhere in "Carla Souza".
    answer = (url) =>
      url.searchParams.get("search") === "3333"
        ? [{ id: "d3", name: "Carla Souza", cnh: "33333333333" }]
        : [{ id: "d1", name: "Ana Lima", cnh: "11111111111" }];

    await render();
    await type("3333");
    await settle(450);

    expect(host!.textContent).toContain("Carla Souza");
    expect(host!.textContent).not.toContain("Nenhum motorista");
  });

  it("does not break on a driver sent without the CNH (the dispatcher's projection)", async () => {
    answer = () => [{ id: "d9", name: "Davi Reis" }];

    await render();

    expect(host!.textContent).toContain("Davi Reis");
    expect(host!.textContent).not.toContain("CNH:");
  });
});
