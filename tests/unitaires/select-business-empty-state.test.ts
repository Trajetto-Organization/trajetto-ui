import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * "Selecione uma empresa" is one box everywhere (decision 3.7).
 *
 * Entregas, Rotas, Torre and Integrações showed an icon, a title and a
 * sentence; Kanban showed a single grey line and Limites de Uso a lightning
 * bolt over one line — the user's own example of the pattern not being
 * followed. Both screens are rendered here with no company selected and must
 * produce the same `EmptyState` box the others do.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

vi.mock("@/store/auth-store", () => {
  const state = { businessId: null, role: "MASTER" };

  return {
    useAuthStore: (selector?: (value: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

vi.mock("@/lib/user-has-permission", () => ({
  useHasPermission: () => true,
}));

// The selector itself is not what is under test; it is the line above.
vi.mock("@/app/(protected)/_components/shared/business-selector", () => ({
  BusinessSelector: () => null,
}));

vi.mock(
  "@/app/(protected)/_components/kanban/board-provider/hooks/kanban-infinite-scroll",
  () => ({
    useKanbanInfiniteScroll: () => ({
      columns: undefined,
      lastElementRef: () => {},
      isLoading: false,
      isFetching: false,
      hasError: false,
      errorMessage: null,
      refetch: () => {},
      hasNextPage: false,
      totalColumns: 0,
      hasSearchResults: false,
      isSearching: false,
    }),
  }),
);

// The board and the dialogs pull in server actions and drag-and-drop; none
// of them renders without a company.
vi.mock("@/app/(protected)/_components/kanban/board", () => ({
  KanbanBoard: () => null,
}));
vi.mock(
  "@/app/(protected)/_components/kanban/column/create-column-modal",
  () => ({ CreateColumnModal: () => null }),
);
vi.mock("@/app/(protected)/_components/kanban/revalidate-button", () => ({
  KanbanRevalidationButton: () => null,
}));
vi.mock("@/app/(protected)/_components/kanban/empty-state", () => ({
  KanbanEmptyState: () => null,
}));

vi.mock(
  "@/app/(protected)/_components/shared/limits/limits-content/hooks",
  () => ({
    useLimitsContent: () => ({
      aiUsage: null,
      entitlements: null,
      isLoading: false,
      errorMessage: null,
      businessId: undefined,
    }),
  }),
);

import { KanbanBoardProvider } from "@/app/(protected)/_components/kanban/board-provider";
import { LimitsContent } from "@/app/(protected)/_components/shared/limits/limits-content";
import {
  SelectBusinessEmptyState,
  SELECT_BUSINESS_TITLE,
} from "@/components/shared/custom/select-business-empty-state";

// This runner compiles JSX with the classic runtime; the app's components
// (built for Next's automatic runtime) find `React` as a global at render.
(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

async function mount(element: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

/** Icon, title and a description that says more than the title. */
function expectStandardBox(host: HTMLElement): void {
  const box = host.querySelector("[data-empty-state]");

  expect(box, "a tela não usa a caixa vazia padrão").not.toBeNull();

  const [title, description] = Array.from(box!.querySelectorAll("p")).map(
    (paragraph) => paragraph.textContent ?? "",
  );

  expect(box!.querySelector("svg")).not.toBeNull();
  expect(title).toBe(SELECT_BUSINESS_TITLE);
  expect(description.length).toBeGreaterThan(20);
  expect(description.toLowerCase()).not.toContain("selecione uma empresa");
}

describe("no company selected on /admin", () => {
  it("the shared component has an icon, a title and a description", async () => {
    const host = await mount(
      createElement(SelectBusinessEmptyState, {
        description:
          "As rotas são de uma operação específica; escolha a empresa acima.",
      }),
    );

    expectStandardBox(host);
  });

  it("the Kanban shows the same box as the other screens", async () => {
    const host = await mount(
      createElement(KanbanBoardProvider, { mode: "admin" }),
    );

    expectStandardBox(host);
  });

  it("Limites de Uso shows the same box as the other screens", async () => {
    const host = await mount(
      createElement(LimitsContent, {
        mode: "admin",
        showBusinessSelector: true,
      }),
    );

    expectStandardBox(host);
  });
});
