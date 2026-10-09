import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selected: null as null | { id: string; corporate_reason: string },
}));

vi.mock("@/app/(protected)/_components/shared/business-selector/hooks", () => ({
  useBusinessSelector: () => ({
    open: false,
    searchValue: "",
    setOpen: () => {},
    setSearchValue: () => {},
    errorMessage: "",
    filteredBusiness: [],
    handleBusinessChange: () => {},
    handleRetry: () => {},
    hasError: false,
    isFetching: false,
    isLoading: false,
    lastElementRef: () => {},
    selectedBusiness: state.selected,
    business: [],
    isSearchPending: false,
  }),
}));

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";

/**
 * The company picker at the top of every /admin screen is a `combobox`, and a
 * combobox does not take its name from its content (ARIA: name from author
 * only). Found by tests/a11y/admin-and-public.spec.ts — axe `button-name`,
 * critical, on every /admin page that has the picker: a screen reader said
 * "combobox, collapsed" and nothing about which company the screen shows.
 */
beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function render(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);

  await act(async () => {
    root = createRoot(host);
    root.render(
      createElement(BusinessSelector, {
        currentBusinessId: state.selected?.id,
      }),
    );
  });

  return host.querySelector('[role="combobox"]') as HTMLElement;
}

describe("the company selector", () => {
  it("says which company is picked", async () => {
    state.selected = { id: "b-1", corporate_reason: "Transportadora Alfa" };

    const combobox = await render();

    expect(combobox.getAttribute("aria-label")).toBe(
      "Empresa: Transportadora Alfa",
    );
  });

  it("and asks for one when none is picked", async () => {
    state.selected = null;

    const combobox = await render();

    expect(combobox.getAttribute("aria-label")).toBe("Selecione uma empresa");
  });
});
