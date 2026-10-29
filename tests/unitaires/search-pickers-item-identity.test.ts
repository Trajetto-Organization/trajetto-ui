import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The wizard pickers of the fleet forms (fuel type, vehicle, vehicle type,
 * part), mounted with two rows that read the same.
 *
 * cmdk identifies an item by its `value` and merges items whose values are
 * equal: hovering one lit up both, and Enter ran the FIRST row's onSelect
 * whatever the person had moved to. The pickers passed the row's text — or
 * nothing, so cmdk took the text — as the value, and a company can have two
 * "Diesel S10" or two parts called "Filtro de óleo". Found while driving the
 * fuelling form in tests/ui/journey-fleet.spec.ts.
 *
 * The rows come from the data hooks, which are stubbed: what is under test is
 * the list and its keyboard, not the fetching.
 */
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

const FIRST = "018f0000-0000-7000-8000-000000000001";
const SECOND = "018f0000-0000-7000-8000-000000000002";

const { rows, hookResult } = vi.hoisted(() => {
  const rows = { current: [] as Record<string, unknown>[] };

  const hookResult = (key: string) => () => ({
    [key]: rows.current,
    lastElementRef: () => undefined,
    isLoading: false,
    isFetching: false,
    refetch: () => undefined,
    hasError: false,
    errorMessage: null,
    isSearchSettled: true,
  });

  return { rows, hookResult };
});

vi.mock(
  "@/app/(protected)/_components/shared/searches/search-fuel-type/hooks/fuel-type-infinite-scroll",
  () => ({
    useFuelTypeInfiniteScroll: hookResult("fuelTypes"),
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/searches/search-part/hooks/part-infinite-scroll",
  () => ({
    usePartInfiniteScroll: hookResult("parts"),
  }),
);
vi.mock(
  "@/app/(protected)/_components/shared/searches/search-vehicle-type/hooks/vehicle-type-infinite-scroll",
  () => ({ useVehicleTypeInfiniteScroll: hookResult("vehicleTypes") }),
);
vi.mock(
  "@/app/(protected)/_components/shared/searches/search-vehicle/hooks/vehicle-infinite-scroll",
  () => ({
    useVehicleInfiniteScroll: hookResult("vehicles"),
  }),
);

import { SearchFuelType } from "@/app/(protected)/_components/shared/searches/search-fuel-type";
import { SearchPart } from "@/app/(protected)/_components/shared/searches/search-part";
import { SearchVehicleType } from "@/app/(protected)/_components/shared/searches/search-vehicle-type";
import { SearchVehicle } from "@/app/(protected)/_components/shared/searches/search-vehicle";

let root: Root | null = null;

beforeAll(() => {
  // cmdk scrolls the highlighted row into view; happy-dom has no layout.
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function mount(element: React.ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");

  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(element));

  return host;
}

async function key(target: Element, name: string): Promise<void> {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: name,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

const BUSINESS = "018f0000-0000-7000-8000-00000000000a";

const CASES = [
  {
    name: "fuel type",
    rows: [
      { id: FIRST, description: "Diesel S10" },
      { id: SECOND, description: "Diesel S10" },
    ],
    render: (onPick: (id: string) => void) =>
      createElement(SearchFuelType, {
        businessId: BUSINESS,
        searchFuelTypeInputValue: "",
        handleUpdateSearchFuelTypeInputValue: (picked: {
          fuelTypeId: string;
        }) => onPick(picked.fuelTypeId),
      }),
  },
  {
    name: "part",
    rows: [
      { id: FIRST, description: "Filtro de óleo" },
      { id: SECOND, description: "Filtro de óleo" },
    ],
    render: (onPick: (id: string) => void) =>
      createElement(SearchPart, {
        businessId: BUSINESS,
        searchPartInputValue: "",
        handleUpdateSearchPartInputValue: (picked: { partId: string }) =>
          onPick(picked.partId),
      }),
  },
  {
    name: "vehicle type",
    rows: [
      { id: FIRST, description: "Truck", number_of_axles: 3 },
      { id: SECOND, description: "Truck", number_of_axles: 3 },
    ],
    render: (onPick: (id: string) => void) =>
      createElement(SearchVehicleType, {
        businessId: BUSINESS,
        searchVehicleTypeInputValue: "",
        handleUpdateSearchVehicleTypeInputValue: (picked: {
          vehicleTypeId: string;
        }) => onPick(picked.vehicleTypeId),
      }),
  },
  {
    name: "vehicle",
    rows: [
      // The same text twice is not possible for vehicles (plates are
      // unique), but the list had no value at all: cmdk keyed it by text.
      { id: FIRST, description: "Caminhão", license_plate: "ABC1D23" },
      { id: SECOND, description: "Caminhão", license_plate: "ABC1D23" },
    ],
    render: (onPick: (id: string) => void) =>
      createElement(SearchVehicle, {
        businessId: BUSINESS,
        handleUpdateSearchVehicleInputValue: (picked: { vehicleId: string }) =>
          onPick(picked.vehicleId),
      }),
  },
] as const;

describe("the step pickers identify the row by id", () => {
  for (const testCase of CASES) {
    it(`${testCase.name}: two identical rows are two items, and Enter picks the highlighted one`, async () => {
      rows.current = testCase.rows.map((row) => ({ ...row }));

      const picked: string[] = [];
      const host = await mount(
        testCase.render((id) => picked.push(id)) as React.ReactElement,
      );

      const items = [...host.querySelectorAll("[cmdk-item]")];

      expect(items).toHaveLength(2);
      expect(items.map((item) => item.getAttribute("data-value"))).toEqual([
        FIRST,
        SECOND,
      ]);

      // The keyboard path: move to the second row and press Enter.
      const input = host.querySelector("[cmdk-input]")!;

      await key(input, "ArrowDown");

      expect(
        [...host.querySelectorAll('[cmdk-item][aria-selected="true"]')].map(
          (item) => item.getAttribute("data-value"),
        ),
        "mais de uma linha destacada ao mesmo tempo",
      ).toEqual([SECOND]);

      await key(input, "Enter");

      expect(picked).toEqual([SECOND]);
    });
  }
});
