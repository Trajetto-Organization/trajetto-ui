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

import { useAccountPayableByResponsibleUserInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-account-payable-by-responsible-user/hooks/account-payable-by-responsible-user-infinite-scroll";
import { useBranchInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-branch/hooks/branch-infinite-scroll";
import { useBusinessInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-business/hooks/business-infinite-scroll";
import { useDriverInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-driver/hooks/driver-infinite-scroll";
import { useFuelInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-fuel/hooks/fuel-infinite-scroll";
import { useFuelTypeInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-fuel-type/hooks/fuel-type-infinite-scroll";
import { usePartInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-part/hooks/part-infinite-scroll";
import { useProfileInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-profile-access/hooks/profile-infinite-scroll";
import { useServiceOrderByVehicleInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-service-order-by-vehicle/hooks/service-order-by-vehicle-infinite-scroll";
import { useServiceOrderInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-service-order/hooks/service-order-infinite-scroll";
import { useShipperInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-shipper/hooks/shipper-infinite-scroll";
import { useSupplierInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-supplier/hooks/supplier-infinite-scroll";
import { useTrafficViolationCodeInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-traffic-violation-code/hooks/traffic-violation-code-infinite-scroll";
import { useUserInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-user/hooks/user-infinite-scroll";
import { useVehicleInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-vehicle/hooks/vehicle-infinite-scroll";
import { useVehicleTypeInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-vehicle-type/hooks/vehicle-type-infinite-scroll";
import { useFetchVehicleData } from "@/app/(protected)/_components/shared/searches/search-vehicle-by-id-business";
import { seedPublicConfig } from "./helpers/public-config";

/**
 * The 16 picker lists, across sessions (Entregas 1, Geral 6).
 *
 * The reported case: the MASTER deactivates a shipper, the BUSINESS_ADMIN
 * reopens "Nova Entrega" in another browser and still sees it — Atualizar
 * included — until F5. Every picker read with `refetchOnMount: false`, so a
 * list closed in a dialog was never asked for again, invalidated or not.
 *
 * And the typed term never left the browser: a row outside the loaded pages
 * could not be found at all.
 *
 * The API is a fake `fetch`; what runs is each real hook on the app's own
 * QueryClient.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";
const VEHICLE = "018f0000-0000-7000-8000-00000000000c";

type Row = { id: string; name: string };

let rows: Row[] = [];
const requests: URL[] = [];

/** What `parseNDJSON` reads: the meta line, then one line per row. */
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

type UseList = (search?: string) => Record<string, unknown>;

/** Label, the hook as a screen calls it, the path it must reach, the list field. */
const PICKERS: Array<[string, UseList, string, string]> = [
  [
    "responsible user's accounts payable",
    (s) => useAccountPayableByResponsibleUserInfiniteScroll(s),
    "/account-payable/search-account-payable-by-responsible-user",
    "accountPayables",
  ],
  [
    "branch",
    (s) => useBranchInfiniteScroll(BUSINESS, s),
    "/branch/search-branch-business",
    "branches",
  ],
  [
    "company",
    (s) => useBusinessInfiniteScroll(s),
    "/business/search-business",
    "business",
  ],
  [
    "driver",
    (s) => useDriverInfiniteScroll(BUSINESS, s),
    "/driver/search-driver-business",
    "drivers",
  ],
  [
    "vehicle refueling",
    (s) => useFuelInfiniteScroll(VEHICLE, BUSINESS, s),
    `/fuel/search-fuel-by-vehicle/${VEHICLE}`,
    "fuels",
  ],
  [
    "fuel type",
    (s) => useFuelTypeInfiniteScroll(BUSINESS, s),
    "/fuel-type/search-fuel-type-business",
    "fuelTypes",
  ],
  [
    "part",
    (s) => usePartInfiniteScroll(BUSINESS, s),
    "/part/search-part-business",
    "parts",
  ],
  [
    "access profile",
    (s) => useProfileInfiniteScroll(BUSINESS, s),
    "/profile-access/search-profile-business",
    "profiles",
  ],
  [
    "vehicle service order",
    (s) => useServiceOrderByVehicleInfiniteScroll(VEHICLE, BUSINESS, s),
    `/service-order/search-service-order-by-vehicle/${VEHICLE}`,
    "serviceOrders",
  ],
  [
    "service order",
    (s) => useServiceOrderInfiniteScroll(BUSINESS, s),
    "/service-order/search-service-order-business",
    "serviceOrders",
  ],
  [
    "shipper",
    (s) => useShipperInfiniteScroll(BUSINESS, s),
    "/shipper/search-shipper-business",
    "shippers",
  ],
  [
    "supplier",
    (s) => useSupplierInfiniteScroll(BUSINESS, s),
    "/supplier/search-supplier-business",
    "suppliers",
  ],
  [
    "traffic violation code",
    (s) => useTrafficViolationCodeInfiniteScroll(s),
    "/traffic-violation/search-traffic-violation-codes",
    "trafficViolationCode",
  ],
  [
    "user",
    (s) => useUserInfiniteScroll(BUSINESS, s),
    "/user/search-user-business",
    "users",
  ],
  [
    "vehicle",
    (s) => useVehicleInfiniteScroll(BUSINESS, s),
    "/vehicle/search-vehicle-business",
    "vehicles",
  ],
  [
    "vehicle type",
    (s) => useVehicleTypeInfiniteScroll(BUSINESS, s),
    "/vehicle-type/search-vehicle-type-business",
    "vehicleTypes",
  ],
];

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
  seedPublicConfig({ apiUrl: "http://api.test" });
});

beforeEach(() => {
  rows = [{ id: "r1", name: "Transportes Alfa" }];
  requests.length = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      requests.push(relayed(input));

      return ndjsonResponse([
        { meta: { searchMeta: { nextCursor: null, hasMore: false } } },
        ...rows,
      ]);
    }),
  );
});

const mounted: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (mounted.length) await mounted.pop()!();

  queryClientProps.clear();
  vi.restoreAllMocks();
});

let seen: Record<string, unknown> = {};

async function mount(
  use: UseList,
  search?: string,
): Promise<() => Promise<void>> {
  const Probe = () => {
    seen = use(search);
    return null;
  };

  const container = document.createElement("div");
  const root = createRoot(container);

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
    const at = mounted.indexOf(unmount);
    if (at >= 0) mounted.splice(at, 1);
    await act(async () => root.unmount());
  };

  mounted.push(unmount);
  return unmount;
}

async function until(condition: () => boolean, ms = 2_000): Promise<boolean> {
  // performance.now: one test freezes Date.now to move react-query's clock.
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

const names = (field: string) =>
  ((seen[field] as Row[] | undefined) ?? []).map((row) => row.name);

describe.each(PICKERS)("the %s picker", (_label, use, path, field) => {
  it("asks for the list again when the dialog reopens after a change", async () => {
    const close = await mount(use);

    expect(await until(() => names(field).length === 1)).toBe(true);
    expect(requests[0].pathname).toBe(path);

    await close();

    // Another session changed the catalogue; this tab is told (a mutation,
    // Atualizar or `catalogChanged` invalidates the entity's prefix).
    rows = [{ id: "r2", name: "Transportes Beta" }];
    await queryClientProps.invalidateQueries();

    await mount(use);

    expect(
      await until(() => names(field).includes("Transportes Beta")),
      "o seletor reabriu com a lista antiga",
    ).toBe(true);
    expect(requests).toHaveLength(2);
  });

  it("sends the typed term to the API", async () => {
    await mount(use, "  joão   da silva ");

    expect(await until(() => requests.length > 0, 1_500)).toBe(true);

    const sent = requests[requests.length - 1];

    expect(sent.pathname).toBe(path);
    expect(sent.searchParams.get("search")).toBe("joão da silva");
  });
});

describe("the vehicle mileage read by the forms", () => {
  let mileage: Record<string, number> = {};
  let held: Array<() => void> = [];

  beforeEach(() => {
    mileage = { [VEHICLE]: 1_000, "vehicle-b": 52_000 };
    held = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = relayed(input);
        requests.push(url);

        const id = url.pathname.split("/")[3];

        // Vehicle B answers only when the test lets it, to look at the
        // form while its request is in flight.
        if (id === "vehicle-b") {
          await new Promise<void>((release) => held.push(release));
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ current_mileage: mileage[id] }),
        };
      }),
    );
  });

  let data: { current_mileage?: number } | undefined;
  let vehicleId = VEHICLE;

  const Form = () => {
    data =
      useFetchVehicleData({ vehicleId, businessId: BUSINESS }).data ??
      undefined;
    return null;
  };

  async function render(): Promise<{
    rerender(): Promise<void>;
    close(): Promise<void>;
  }> {
    const root = createRoot(document.createElement("div"));
    const tree = () =>
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(Form),
      );

    await act(async () => root.render(tree()));

    return {
      rerender: async () => act(async () => root.render(tree())),
      close: async () => act(async () => root.unmount()),
    };
  }

  it("is read again when the form reopens", async () => {
    vehicleId = VEHICLE;

    const first = await render();
    expect(await until(() => data?.current_mileage === 1_000)).toBe(true);
    await first.close();

    // A refueling recorded in another session moved the odometer.
    mileage[VEHICLE] = 1_500;

    const second = await render();

    expect(
      await until(() => data?.current_mileage === 1_500),
      "o formulário validou contra a quilometragem antiga",
    ).toBe(true);

    await second.close();
  });

  it("does not show another vehicle's mileage while loading", async () => {
    vehicleId = VEHICLE;

    const form = await render();
    expect(await until(() => data?.current_mileage === 1_000)).toBe(true);

    vehicleId = "vehicle-b";
    await form.rerender();
    await until(() => held.length > 0, 500);

    expect(
      data?.current_mileage,
      "o veículo B apareceu com os 1.000 km do A",
    ).toBeUndefined();

    held.forEach((release) => release());
    expect(await until(() => data?.current_mileage === 52_000)).toBe(true);

    await form.close();
  });
});

describe("the shipper picker with nobody invalidating anything", () => {
  it("asks again when reopened seconds later", async () => {
    const use = PICKERS.find(([label]) => label === "shipper")![1];

    const close = await mount(use);
    expect(await until(() => names("shippers").length === 1)).toBe(true);
    await close();

    // The MASTER deactivates it while this dialog is closed; the admin
    // reopens "Nova Entrega" a few seconds later. No event, no Atualizar.
    rows = [];
    const later = Date.now() + 6_000;
    vi.spyOn(Date, "now").mockImplementation(() => later);

    await mount(use);

    expect(
      await until(
        () => requests.length === 2 && names("shippers").length === 0,
      ),
      "o embarcador desativado continuou no seletor",
    ).toBe(true);
  });
});

describe("another company's list while the new one loads", () => {
  /**
   * `keepPreviousData` holds the rows on screen while a new term is in
   * flight. It also held them when the company changed: a form switched from
   * A to B kept offering A's drivers as choices until B's page arrived, and
   * nothing told the picker those rows were A's.
   */
  const OTHER = "018f0000-0000-7000-8000-0000000000aa";

  let held: Array<() => void> = [];
  let driverBusiness = BUSINESS;
  let drivers: { items?: unknown; isLoading?: unknown; drivers?: Row[] } = {};

  beforeEach(() => {
    held = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = relayed(input);
        requests.push(url);

        const company = url.searchParams.get("businessId");

        // Company B, and any typed term, answer only when the test lets them.
        if (company === OTHER || url.searchParams.has("search")) {
          await new Promise<void>((release) => held.push(release));
        }

        const found =
          company === OTHER
            ? [{ id: "b1", name: "Motorista da Beta" }]
            : [{ id: "a1", name: "Motorista da Alfa" }];

        return ndjsonResponse([
          { meta: { searchMeta: { nextCursor: null, hasMore: false } } },
          ...found,
        ]);
      }),
    );
  });

  const Form = ({ search }: { search?: string }) => {
    drivers = useDriverInfiniteScroll(driverBusiness, search) as typeof drivers;
    return null;
  };

  async function render(search?: string) {
    const root = createRoot(document.createElement("div"));
    const tree = (term?: string) =>
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(Form, { search: term }),
      );

    await act(async () => root.render(tree(search)));
    mounted.push(async () => act(async () => root.unmount()));

    return {
      rerender: async (term?: string) =>
        act(async () => root.render(tree(term))),
    };
  }

  const shown = () => (drivers.drivers ?? []).map((row) => row.name);

  it("does not offer the previous company's drivers", async () => {
    driverBusiness = BUSINESS;
    const form = await render();

    expect(await until(() => shown().join() === "Motorista da Alfa")).toBe(
      true,
    );

    driverBusiness = OTHER;
    await form.rerender();
    expect(await until(() => held.length > 0, 1_000)).toBe(true);

    expect(
      shown(),
      "os motoristas da empresa A continuaram selecionáveis sob a B",
    ).toEqual([]);
    expect(drivers.isLoading).toBe(true);

    held.forEach((release) => release());
    expect(await until(() => shown().join() === "Motorista da Beta")).toBe(
      true,
    );
  });

  it("keeps the rows on screen while a new term of the same company is fetched", async () => {
    driverBusiness = BUSINESS;
    const form = await render();

    expect(await until(() => shown().join() === "Motorista da Alfa")).toBe(
      true,
    );

    await form.rerender("alf");
    expect(await until(() => held.length > 0, 1_500)).toBe(true);

    // Same list, new term in flight: the rows stay instead of collapsing to
    // a skeleton on every keystroke.
    expect(shown()).toEqual(["Motorista da Alfa"]);
    expect(drivers.isLoading).toBe(false);

    held.forEach((release) => release());
  });
});
