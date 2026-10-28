import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
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

import { queryClientProps } from "@/lib/query-client-props";
import { applyCatalogChange } from "@/lib/catalog-sync";
import { SEARCH_DEBOUNCE_MS } from "@/hooks/use-cursor-search";

import { useDriverInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-driver/hooks/driver-infinite-scroll";
import { useVehicleInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-vehicle/hooks/vehicle-infinite-scroll";

import { seedPublicConfig } from "./helpers/public-config";

/**
 * The vehicle and driver lists of "Selecionar Veículo e Motorista", read
 * again and again.
 *
 * Each picker trusted its rows for 5 s: reopening the dialog, or typing a
 * term already typed a minute before, read every loaded page anew. And with
 * the whole list already loaded (a small fleet), every keystroke still went
 * to the API for rows the browser had. The lists are now trusted for minutes
 * (catalog-sync invalidates them on any write), and a list the cache holds
 * whole answers a term itself.
 *
 * The API is a fake `fetch`; what runs is each real hook on the app's own
 * QueryClient.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

type Driver = { id: string; name: string; cnh?: string };

let drivers: Driver[] = [];
/** Whether the API says more pages follow the first one. */
let hasMore = false;
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

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
  seedPublicConfig({ apiUrl: "http://api.test" });
});

beforeEach(() => {
  requests.length = 0;
  hasMore = false;
  drivers = [
    { id: "d1", name: "Ana Lima", cnh: "11111111111" },
    { id: "d2", name: "Bruno Reis", cnh: "22222222222" },
  ];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(String(input), "http://web.test");
      requests.push(url);

      const term = url.searchParams.get("search")?.toLowerCase();
      const rows = term
        ? drivers.filter((driver) =>
            [driver.name, driver.cnh ?? ""].some((value) =>
              value.toLowerCase().includes(term),
            ),
          )
        : drivers;

      return ndjsonResponse([
        {
          meta: {
            searchMeta: {
              nextCursor: hasMore ? "next" : null,
              hasMore,
            },
          },
        },
        ...rows,
      ]);
    }),
  );
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();

  queryClientProps.clear();
  vi.restoreAllMocks();
});

let seen: { drivers?: Driver[]; isSearchSettled?: boolean } = {};

/** The driver picker's list, as the form renders it, with a term to change. */
async function mountDrivers(initial = "") {
  let setTerm: (term: string) => void = () => {};

  const Probe = () => {
    const [term, set] = React.useState(initial);
    setTerm = set;
    seen = useDriverInfiniteScroll(BUSINESS, term) as typeof seen;
    return null;
  };

  const root = createRoot(document.createElement("div"));

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(Probe),
      ),
    );
  });

  const unmount = async () => {
    const at = unmounts.indexOf(unmount);
    if (at >= 0) unmounts.splice(at, 1);
    await act(async () => root.unmount());
  };

  unmounts.push(unmount);

  return {
    type: async (term: string) => act(async () => setTerm(term)),
    unmount,
  };
}

async function settle(ms: number) {
  await act(async () => {
    await new Promise((done) => setTimeout(done, ms));
  });
}

async function until(condition: () => boolean, ms = 2_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await settle(20);
  }

  return condition();
}

/** Moves react-query's clock past the old 5 s trust, within the new one. */
function sixSecondsLater() {
  const later = Date.now() + 6_000;

  vi.spyOn(Date, "now").mockImplementation(() => later);
}

const names = () => (seen.drivers ?? []).map((driver) => driver.name);
const searched = () =>
  requests.map((url) => url.searchParams.get("search") ?? "");

describe("the driver picker's cache", () => {
  it("does not read the list again when the dialog reopens a moment later", async () => {
    const first = await mountDrivers();

    expect(await until(() => names().length === 2)).toBe(true);
    await first.unmount();

    sixSecondsLater();

    await mountDrivers();
    expect(await until(() => names().length === 2)).toBe(true);
    await settle(50);

    expect(requests).toHaveLength(1);
  });

  it("serves a term typed again from the cache", async () => {
    hasMore = true;

    const picker = await mountDrivers();
    expect(await until(() => names().length === 2)).toBe(true);

    await picker.type("bruno");
    expect(await until(() => names().join() === "Bruno Reis")).toBe(true);

    await picker.type("");
    await settle(SEARCH_DEBOUNCE_MS + 50);

    sixSecondsLater();

    await picker.type("bruno");
    await settle(SEARCH_DEBOUNCE_MS + 50);

    expect(names()).toEqual(["Bruno Reis"]);
    expect(searched().filter((term) => term === "bruno")).toHaveLength(1);
  });

  it("still reads the list again after catalogChanged invalidated it", async () => {
    const first = await mountDrivers();

    expect(await until(() => names().length === 2)).toBe(true);
    await first.unmount();

    // Another session added a driver: the API tells the company's room.
    drivers = [...drivers, { id: "d3", name: "Carla Souza" }];
    await applyCatalogChange(queryClientProps, {
      businessId: BUSINESS,
      entity: "driver",
    });

    await mountDrivers();

    expect(
      await until(() => names().includes("Carla Souza")),
      "o seletor reabriu com a lista antiga",
    ).toBe(true);
    expect(requests).toHaveLength(2);
  });
});

describe("a list the cache holds whole", () => {
  it("answers a term itself, without asking the API", async () => {
    const picker = await mountDrivers();
    expect(await until(() => names().length === 2)).toBe(true);

    await picker.type("bru");

    // At once, not after the debounce: the answer is already here.
    expect(names()).toEqual(["Bruno Reis"]);
    expect(seen.isSearchSettled).toBe(true);

    await settle(SEARCH_DEBOUNCE_MS + 100);

    expect(searched()).toEqual([""]);
  });

  it("matches the CNH the API also searches", async () => {
    const picker = await mountDrivers();
    expect(await until(() => names().length === 2)).toBe(true);

    await picker.type("2222");
    await settle(SEARCH_DEBOUNCE_MS + 100);

    expect(names()).toEqual(["Bruno Reis"]);
    expect(requests).toHaveLength(1);
  });

  it("still asks the API for a term nothing loaded matches", async () => {
    // A row can come without a field the API searches (the dispatcher's
    // projection has no CNH): "nothing found" is not the browser's call.
    const picker = await mountDrivers();
    expect(await until(() => names().length === 2)).toBe(true);

    await picker.type("zé");

    expect(seen.isSearchSettled).toBe(false);

    expect(
      await until(() => searched().includes("zé")),
      "o termo sem correspondência local não foi ao servidor",
    ).toBe(true);
    expect(await until(() => seen.isSearchSettled === true)).toBe(true);
    expect(names()).toEqual([]);
  });

  it("goes to the API for every term when more pages remain", async () => {
    hasMore = true;

    const picker = await mountDrivers();
    expect(await until(() => names().length === 2)).toBe(true);

    await picker.type("bru");

    // Narrowed on screen while the server's answer is on its way.
    expect(names()).toEqual(["Bruno Reis"]);
    expect(seen.isSearchSettled).toBe(false);

    expect(await until(() => searched().includes("bru"))).toBe(true);
  });
});

describe("the vehicle picker's list", () => {
  it("is trusted for minutes too, and narrowed by plate locally", async () => {
    let vehicles: Record<string, unknown> = {};

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        requests.push(new URL(String(input), "http://web.test"));

        return ndjsonResponse([
          { meta: { searchMeta: { nextCursor: null, hasMore: false } } },
          { id: "v1", description: "Caminhão", license_plate: "ABC1D23" },
          { id: "v2", description: "Van", license_plate: "XYZ9K88" },
        ]);
      }),
    );

    let setTerm: (term: string) => void = () => {};

    const Probe = () => {
      const [term, set] = React.useState("");
      setTerm = set;
      vehicles = useVehicleInfiniteScroll(BUSINESS, term);
      return null;
    };

    const root = createRoot(document.createElement("div"));

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClientProps },
          createElement(Probe),
        ),
      );
    });
    unmounts.push(async () => act(async () => root.unmount()));

    type Plate = { license_plate: string };

    const plates = () =>
      ((vehicles.vehicles ?? []) as Plate[]).map((row) => row.license_plate);

    expect(await until(() => plates().length === 2)).toBe(true);

    await act(async () => setTerm("xyz"));
    await settle(SEARCH_DEBOUNCE_MS + 100);

    expect(plates()).toEqual(["XYZ9K88"]);
    expect(requests).toHaveLength(1);

    const query = queryClientProps
      .getQueryCache()
      .find(["vehicle", BUSINESS], { exact: true });

    expect(query?.isStale()).toBe(false);
  });
});
