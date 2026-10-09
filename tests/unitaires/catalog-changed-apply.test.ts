import { QueryObserver } from "react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CATALOG_QUERY_ROOTS,
  applyCatalogChange,
  isCatalogChangedEvent,
} from "@/lib/catalog-sync";
import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a `catalogChanged` event does to this tab's cache (decision 2.3),
 * without a socket.
 *
 * catalog-changed-sync.test.ts proves the same end to end against a real
 * Socket.IO server, but it borrows socket.io from the API's node_modules and
 * is skipped in a checkout of the web alone. The company scoping and the
 * payload check are the parts that decide whether one carrier's edit
 * refetches another carrier's lists, so they are covered here on their own.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";
const OTHER_BUSINESS = "018f0000-0000-7000-8000-00000000000c";

const unsubscribers: Array<() => void> = [];

afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  queryClientProps.clear();
});

/** A query somebody is rendering, counting how often the API is asked. */
function onScreen(queryKey: unknown[]) {
  const fetches = vi.fn(async () => ["row"]);

  const observer = new QueryObserver(queryClientProps, {
    queryKey,
    queryFn: fetches,
  });
  unsubscribers.push(observer.subscribe(() => undefined));

  return fetches;
}

const settle = () => new Promise((done) => setTimeout(done, 30));

describe("applyCatalogChange", () => {
  it("refetches the entity's lists of that company only, every search term included", async () => {
    const shippers = onScreen(["shipper", BUSINESS]);
    const shipperSearch = onScreen(["shipper", BUSINESS, { search: "alfa" }]);
    const otherCompany = onScreen(["shipper", OTHER_BUSINESS]);
    const drivers = onScreen(["driver", BUSINESS]);
    await settle();

    await applyCatalogChange(queryClientProps, {
      businessId: BUSINESS,
      entity: "shipper",
    });
    await settle();

    expect(shippers).toHaveBeenCalledTimes(2);
    expect(shipperSearch).toHaveBeenCalledTimes(2);
    expect(
      otherCompany,
      "refez a lista de outra empresa",
    ).toHaveBeenCalledTimes(1);
    expect(drivers, "refez um catálogo que não mudou").toHaveBeenCalledTimes(1);
    expect(
      queryClientProps.getQueryState(["shipper", OTHER_BUSINESS])
        ?.isInvalidated,
    ).toBe(false);
  });

  it("marks a closed picker of that company stale, so it asks again when it opens", async () => {
    queryClientProps.setQueryData(["vehicleData", "vehicle-1", BUSINESS], {
      current_mileage: 1,
    });
    queryClientProps.setQueryData(
      ["vehicleData", "vehicle-1", OTHER_BUSINESS],
      { current_mileage: 2 },
    );

    await applyCatalogChange(queryClientProps, {
      businessId: BUSINESS,
      entity: "vehicle",
    });

    expect(
      queryClientProps.getQueryState(["vehicleData", "vehicle-1", BUSINESS])
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClientProps.getQueryState([
        "vehicleData",
        "vehicle-1",
        OTHER_BUSINESS,
      ])?.isInvalidated,
    ).toBe(false);
  });

  it.each(Object.entries(CATALOG_QUERY_ROOTS))(
    "reaches every key %s is read under",
    async (entity, roots) => {
      const lists = roots.map((root) => onScreen([root, BUSINESS]));
      await settle();

      await applyCatalogChange(queryClientProps, {
        businessId: BUSINESS,
        entity: entity as keyof typeof CATALOG_QUERY_ROOTS,
      });
      await settle();

      for (const fetches of lists) expect(fetches).toHaveBeenCalledTimes(2);
    },
  );
});

describe("isCatalogChangedEvent", () => {
  it("knows exactly the entities of the API contract", () => {
    // The contract of decision 2.3, as the API emits it. A rename on one
    // side must break here, not silently stop refreshing.
    expect(Object.keys(CATALOG_QUERY_ROOTS).sort()).toEqual(
      [
        "branch",
        "driver",
        "fuel_type",
        "message_template",
        "occurrence_type",
        "part",
        "profile_access",
        "shipper",
        "status_reason",
        "supplier",
        "vehicle",
        "vehicle_type",
      ].sort(),
    );

    for (const entity of Object.keys(CATALOG_QUERY_ROOTS)) {
      expect(
        isCatalogChangedEvent({ businessId: BUSINESS, entity }),
        entity,
      ).toBe(true);
    }
  });

  it.each([
    ["nothing", undefined],
    ["null", null],
    ["a string", "shipper"],
    ["no company", { entity: "shipper" }],
    ["an empty company", { businessId: "", entity: "shipper" }],
    ["a company that is not a string", { businessId: 42, entity: "shipper" }],
    ["an unknown entity", { businessId: BUSINESS, entity: "planet" }],
    [
      "an entity inherited from the prototype",
      { businessId: BUSINESS, entity: "toString" },
    ],
    [
      "an entity that is not a string",
      { businessId: BUSINESS, entity: ["shipper"] },
    ],
  ])("refuses %s", (_label, payload) => {
    expect(isCatalogChangedEvent(payload)).toBe(false);
  });
});
