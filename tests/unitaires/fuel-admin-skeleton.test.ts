import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const url = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(url.search),
}));

import { AdminListLoading } from "@/features/fuel/skeleton/admin-loading";
import { FuelSkeleton } from "@/features/fuel/skeleton";
import { FuelTypeSkeleton } from "@/features/fuel-type/skeleton";
import { CatalogAdminLoading } from "@/components/shared/custom/catalog-list-skeleton/admin-loading";

/**
 * What /admin/fuel and /admin/fuel-type draw while the server answers.
 *
 * Entering from the sidebar there is no company yet: the page is only the
 * selector over "Selecione uma empresa". The skeleton drew three buttons,
 * four cards, the filters and a table anyway, so the layout jumped as soon
 * as the page landed. loading.tsx gets no searchParams, so it reads the URL.
 */
const COMPANY = "018f0000-0000-7000-8000-00000000000a";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  url.search = "";
});

function render(element: React.ReactElement) {
  act(() => root.render(element));
}

const shape = () =>
  container.querySelector("[data-skeleton]")?.getAttribute("data-skeleton");

describe("the /admin loading skeleton follows the URL", () => {
  it("draws only the selector and the empty panel without a company", () => {
    render(
      createElement(AdminListLoading, { actions: 3, cards: 4, filters: 3 }),
    );

    expect(shape()).toBe("select-business");
    expect(container.querySelectorAll(".h-\\[142px\\]")).toHaveLength(0);
  });

  it("draws the list once the URL names a company", () => {
    url.search = `businessId=${COMPANY}`;

    render(
      createElement(AdminListLoading, { actions: 3, cards: 4, filters: 3 }),
    );

    expect(shape()).toBe("list");
    expect(container.querySelectorAll(".h-\\[142px\\]")).toHaveLength(4);
  });

  it("treats a businessId that is not a company id as no company", () => {
    url.search = "businessId=../../x";

    render(
      createElement(AdminListLoading, { actions: 2, cards: 0, filters: 0 }),
    );

    expect(shape()).toBe("select-business");
  });
});

describe("the Suspense fallbacks take the same decision from searchParams", () => {
  it("fuel: the empty panel without a company, the list with one", () => {
    render(createElement(FuelSkeleton, { mode: "admin", hasCompany: false }));
    expect(shape()).toBe("select-business");

    render(createElement(FuelSkeleton, { mode: "admin", hasCompany: true }));
    expect(shape()).toBe("list");
  });

  it("fuel type: the same, and /dashboard always draws the list with its three cards", () => {
    render(
      createElement(FuelTypeSkeleton, { mode: "admin", hasCompany: false }),
    );
    expect(shape()).toBe("select-business");

    render(
      createElement(FuelTypeSkeleton, { mode: "dashboard", hasCompany: false }),
    );
    expect(shape()).toBe("catalog-list");
    expect(container.querySelectorAll(".h-\\[142px\\]")).toHaveLength(3);
  });
});

describe("the catalog /admin loading (Perfis de acesso, Tipos de veículo, Tipos de combustível)", () => {
  it("draws only the selector without a company and the three cards with one", () => {
    render(createElement(CatalogAdminLoading, { columns: 6 }));
    expect(shape()).toBe("select-business");

    url.search = `businessId=${COMPANY}`;
    render(createElement(CatalogAdminLoading, { columns: 6 }));
    expect(shape()).toBe("catalog-list");
    expect(container.querySelectorAll(".h-\\[142px\\]")).toHaveLength(3);
  });
});
