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
import { SearchProfileAccess } from "@/app/(protected)/_components/shared/searches/search-profile-access";
import { seedPublicConfig } from "./helpers/public-config";

/**
 * The access-profile picker in its two uses.
 *
 * The permission form offered a BUSINESS_USER their own profile, and the API
 * accepted a permission created in (or moved into) it: a grant to oneself.
 * The API now refuses that write and, asked with `editable=true`, leaves the
 * profile out of the picker. The user form keeps asking for every profile:
 * giving a colleague the same profile is not a grant to oneself.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000c";

const requests: URL[] = [];

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

      // What the API answers for a user whose own profile is "p-own".
      const rows =
        url.searchParams.get("editable") === "true"
          ? [{ id: "p-ops", name: "Operação" }]
          : [
              { id: "p-ops", name: "Operação" },
              { id: "p-own", name: "Gestão de Acessos" },
            ];

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
  host = null;

  queryClientProps.clear();
  vi.unstubAllGlobals();
});

async function render(props: { editableOnly?: boolean }) {
  if (!host) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  }

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(SearchProfileAccess, {
          businessId: BUSINESS,
          searchProfileAccessInputValue: "",
          handleUpdateSearchProfileAccessInputValue: () => undefined,
          ...props,
        }),
      ),
    );
  });

  await act(async () => {
    await new Promise((done) => setTimeout(done, 50));
  });
}

describe("SearchProfileAccess", () => {
  it("asks only for the editable profiles in the permission form", async () => {
    await render({ editableOnly: true });

    expect(requests.length).toBeGreaterThan(0);
    expect(
      requests.every((url) => url.searchParams.get("editable") === "true"),
    ).toBe(true);
    expect(
      requests.every((url) => url.searchParams.get("businessId") === BUSINESS),
    ).toBe(true);
    expect(host!.textContent).toContain("Operação");
    expect(host!.textContent).not.toContain("Gestão de Acessos");
  });

  it("asks for every profile in the user form", async () => {
    await render({});

    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((url) => !url.searchParams.has("editable"))).toBe(
      true,
    );
    expect(host!.textContent).toContain("Gestão de Acessos");
  });

  it("keeps the two answers apart in the cache", async () => {
    await render({});
    expect(host!.textContent).toContain("Gestão de Acessos");

    // Same company, other use: a fresh request, not the cached full list.
    await render({ editableOnly: true });

    expect(
      requests.some((url) => url.searchParams.get("editable") === "true"),
    ).toBe(true);
    expect(host!.textContent).not.toContain("Gestão de Acessos");
  });
});
