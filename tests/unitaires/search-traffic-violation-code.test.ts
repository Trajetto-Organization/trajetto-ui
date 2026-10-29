import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The infraction-code picker of the fine form searches on the server
 * (FLEET-SEARCH-1). It used to call its hook without the typed term and let
 * cmdk filter the loaded page: with the national table in pages of ten, a
 * code not yet scrolled into view "did not exist".
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const calls = vi.hoisted(() => ({ searches: [] as Array<string | undefined> }));

const CODES = [
  {
    id: "code-1",
    code: "7455",
    sub_code: 0,
    fullCode: "7455-0",
    description: "Transitar em velocidade superior à máxima",
    gravityLabel: "Média",
    points: 4,
    violator_type: "Condutor",
    competent_agency: "Estadual",
  },
];

vi.mock(
  "@/app/(protected)/_components/shared/searches/search-traffic-violation-code/hooks/traffic-violation-code-infinite-scroll",
  () => ({
    useTrafficViolationCodeInfiniteScroll: (search?: string) => {
      calls.searches.push(search);

      // The server already answered for the term: the row matches on the
      // code the person typed, which is not in the item's description.
      return {
        trafficViolationCode: CODES,
        lastElementRef: () => undefined,
        isLoading: false,
        isFetching: false,
        refetch: () => undefined,
        hasError: false,
        errorMessage: null,
        isSearchSettled: true,
      };
    },
  }),
);

import { SearchTrafficViolationCode } from "@/app/(protected)/_components/shared/searches/search-traffic-violation-code";

let root: Root | null = null;
let container: HTMLElement | null = null;

beforeEach(() => {
  calls.searches = [];
  // cmdk measures with ResizeObserver and scrolls items into view.
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("SearchTrafficViolationCode", () => {
  it("sends the typed term to the server and shows its answer as is", () => {
    const onPick = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() =>
      root?.render(
        createElement(SearchTrafficViolationCode, {
          searchTrafficViolationCodeInputValue: "",
          handleUpdateSearchTrafficViolationCodeInputValue: onPick,
        }),
      ),
    );

    const input = container.querySelector("input") as HTMLInputElement;

    typeInto(input, "745-0");

    expect(calls.searches.at(-1)).toBe("745-0");

    // cmdk does not filter the server's rows again.
    expect(container.textContent).toContain("Transitar em velocidade");
  });
});
