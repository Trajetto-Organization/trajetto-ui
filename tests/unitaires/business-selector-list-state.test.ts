import { describe, expect, it } from "vitest";

import { businessListState } from "@/app/(protected)/_components/shared/business-selector/list-state";

/**
 * What the /admin company list shows while a typed search is on its way
 * (FLEET-SEARCH-1).
 *
 * The hook already said the rows on screen were not yet the answer for the
 * term (`isSearchPending`), but the list ignored it: typing a CNPJ narrowed
 * the loaded page to nothing and "Nenhuma empresa encontrada." flashed before
 * the server found the company.
 */
const base = {
  isLoading: false,
  hasError: false,
  isSearchPending: false,
  isFetching: false,
  loadedCount: 20,
  shownCount: 0,
};

describe("the company list's state", () => {
  it("says 'not found' only once the server answered the term", () => {
    expect(businessListState(base)).toEqual({ empty: true, pending: false });
  });

  it("shows a placeholder, not 'not found', while the answer is owed", () => {
    // Debounce: nothing in flight yet, the answer is still owed.
    expect(businessListState({ ...base, isSearchPending: true })).toEqual({
      empty: false,
      pending: true,
    });

    // In flight with nothing loaded yet.
    expect(
      businessListState({
        ...base,
        isSearchPending: true,
        isFetching: true,
        loadedCount: 0,
      }),
    ).toEqual({ empty: false, pending: true });
  });

  it("does not add a placeholder over rows already narrowed locally", () => {
    expect(
      businessListState({ ...base, isSearchPending: true, shownCount: 2 }),
    ).toEqual({ empty: false, pending: false });
  });

  it("leaves the first load and the errors to their own states", () => {
    expect(
      businessListState({ ...base, isLoading: true, loadedCount: 0 }),
    ).toEqual({
      empty: false,
      pending: false,
    });
    expect(businessListState({ ...base, hasError: true })).toEqual({
      empty: false,
      pending: false,
    });
  });

  it("does not double the infinite-scroll skeleton", () => {
    // `isFetching` with loaded rows already draws one skeleton row, and
    // still no "not found" under it.
    expect(
      businessListState({
        ...base,
        isSearchPending: true,
        isFetching: true,
        loadedCount: 20,
      }),
    ).toEqual({ empty: false, pending: false });
  });
});
