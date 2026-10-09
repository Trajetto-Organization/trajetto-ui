import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

import { FineStats } from "@/features/fine/stats";

/**
 * The fines cards render the server's numbers (decision 8.8). Both old
 * screens computed "Pagas" and "Pendentes" from the rows of the page while
 * "Total" was the company's, so on a page of ten out of twelve the shares
 * were wrong.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// The components are compiled with the classic JSX runtime here, so they
// find `React` as a global at render.
(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function render(element: ReturnType<typeof createElement>): HTMLElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => root?.render(element));

  return container;
}

describe("FineStats", () => {
  it("shows the company's counts and shares from searchMeta", () => {
    const view = render(
      createElement(FineStats, {
        searchMeta: {
          total: 12,
          paid: 4,
          pending: 2,
          overdue: 6,
          totalAmount: 1860,
          openAmount: 1200.5,
        },
      }),
    );

    const text = view.textContent ?? "";

    expect(text).toContain("Total de Multas");
    expect(text).toContain("12");
    expect(text).toContain("4 (33%)");
    expect(text).toContain("2 (17%)");
    expect(text).toContain("6 (50%)");
    expect(text).toMatch(/1\.860,00 em multas/);
    expect(text).toMatch(/1\.200,50 em aberto/);
  });

  it("shows zeros, not a stale page count, when the server sent nothing", () => {
    const view = render(createElement(FineStats, { searchMeta: undefined }));

    expect(view.textContent).toContain("Vencidas");
    expect(view.textContent).not.toContain("NaN");
  });
});
