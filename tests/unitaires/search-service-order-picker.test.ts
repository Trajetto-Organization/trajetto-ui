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

import { SearchServiceOrder } from "@/app/(protected)/_components/shared/searches/search-service-order";
import { seedPublicConfig } from "./helpers/public-config";

/**
 * The service order picker of the account payable and part-line forms
 * (FLEET-SEARCH-1), rendered for real on the app's QueryClient, with the API
 * as a fake `fetch`.
 *
 * The typed term never left the browser: cmdk filtered the loaded pages by
 * the display text ("OS#… - data (Veículo … - Placa …)"), so an order past
 * the first page could not be found, and neither could one whose
 * description matched, since the description is not in that text.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

const requests: URL[] = [];

interface OrderRow {
  id: string;
  date: string;
  description: string;
  vehicle: { license_plate: string; description: string };
}

const FIRST_PAGE: OrderRow[] = [
  {
    id: "018f0000-0000-7000-8000-000000000a01",
    date: "2026-09-20T12:00:00.000Z",
    description: "Revisão de 50 mil km",
    vehicle: { license_plate: "AAA1A11", description: "Caminhão A" },
  },
];

// Only the server knows this one: past the loaded page, found by description.
const CLUTCH: OrderRow = {
  id: "018f0000-0000-7000-8000-000000000a02",
  date: "2026-09-21T12:00:00.000Z",
  description: "Troca de embreagem",
  vehicle: { license_plate: "BBB2B22", description: "Caminhão B" },
};

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

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
  seedPublicConfig({ apiUrl: "http://api.test" });

  // cmdk scrolls the active item into view; happy-dom has no layout.
  Element.prototype.scrollIntoView ??= () => {};
});

let root: Root | null = null;
let host: HTMLElement;

beforeEach(() => {
  requests.length = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = relayed(input);
      requests.push(url);

      const term = (url.searchParams.get("search") ?? "").toLowerCase();
      const rows = term
        ? [CLUTCH].filter((row) => row.description.toLowerCase().includes(term))
        : FIRST_PAGE;

      return ndjsonResponse([
        { meta: { searchMeta: { nextCursor: null, hasMore: false } } },
        ...rows,
      ]);
    }),
  );
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  queryClientProps.clear();
  vi.unstubAllGlobals();
  vi.stubGlobal("React", React);
});

async function until(condition: () => boolean, ms = 2_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

async function renderPicker(): Promise<void> {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(SearchServiceOrder, {
          businessId: BUSINESS,
          searchServiceOrderInputValue: "",
          handleUpdateSearchServiceOrderInputValue: () => {},
        }),
      ),
    );
  });
}

async function type(text: string): Promise<void> {
  const input = host.querySelector("input") as HTMLInputElement;
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;

  await act(async () => {
    setValue.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("the service order picker", () => {
  it("sends the typed term to the API and shows what it found", async () => {
    await renderPicker();

    expect(await until(() => host.textContent!.includes("AAA1A11"))).toBe(true);

    await type("  embreagem ");

    expect(
      await until(() =>
        requests.some((url) => url.searchParams.get("search") === "embreagem"),
      ),
      "o termo não foi para a API",
    ).toBe(true);

    const sent = requests.find(
      (url) => url.searchParams.get("search") === "embreagem",
    )!;

    expect(sent.pathname).toBe("/service-order/search-service-order-business");
    expect(sent.searchParams.get("businessId")).toBe(BUSINESS);

    // The match is on the description, which the option's text does not
    // show: re-filtering the answer locally would hide it.
    expect(
      await until(() => host.textContent!.includes("BBB2B22")),
      "a ordem achada pelo servidor não apareceu",
    ).toBe(true);
    expect(host.textContent).not.toContain("AAA1A11");
  });
});
