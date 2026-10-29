import { createElement } from "react";

import { describe, expect, it, vi } from "vitest";

import { renderHtml } from "./helpers/render-html";

/**
 * The company picker's label (decision 3.3).
 *
 * It always said "Selecione a empresa *". Moving a user to another company is
 * optional, so that form had a required-looking field it could not relabel.
 */
vi.mock(
  "@/app/(protected)/_components/shared/searches/search-business/hooks/business-infinite-scroll",
  () => ({
    useBusinessInfiniteScroll: () => ({
      business: [],
      lastElementRef: () => undefined,
      isLoading: false,
      isFetching: false,
      refetch: () => undefined,
      hasError: false,
      errorMessage: null,
      isSearchSettled: true,
    }),
  }),
);

import { SearchBusiness } from "@/app/(protected)/_components/shared/searches/search-business";

const render = (label?: string) =>
  renderHtml(
    createElement(SearchBusiness, {
      searchBusinessInputValue: "",
      handleUpdateSearchBussinessInputValue: () => undefined,
      ...(label ? { label } : {}),
    }),
  );

describe("the company picker's label", () => {
  it("is the required 'Selecione a empresa' by default", () => {
    const html = render();

    expect(html).toContain("Selecione a empresa");
    expect(html).toMatch(/aria-hidden="true"[^>]*>\*</);
  });

  it("takes the caller's label, optional marker included", () => {
    const html = render("Mover para outra empresa (opcional)");

    expect(html).toContain("Mover para outra empresa (opcional)");
    expect(html).not.toContain("Selecione a empresa");
    expect(html).not.toMatch(/aria-hidden="true"[^>]*>\*</);
  });
});
