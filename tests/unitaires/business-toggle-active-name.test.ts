import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The switch is what is under test, not the write behind it.
vi.mock("@/actions/business/toggle-business-active", () => ({
  handleToggleBusinessActive: async () => ({ successMessage: "ok" }),
}));
vi.mock("@/actions/revalidate", () => ({ revalidateTagName: async () => {} }));

import { ToggleBusinessActiveCell } from "@/app/(protected)/_components/admin/business/toggle-active-cell";

/**
 * The Ativo/Inativo switch in /admin/business had no name: axe `button-name`
 * (critical) on every row, found by tests/a11y/admin-and-public.spec.ts. A
 * screen reader announced "switch, on" with no hint of what it switches —
 * and turning a company off logs out everybody in it. The branch table's
 * switch already said what it does; this one now does too, with the company.
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

async function switchOf(isActive: boolean): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);

  await act(async () => {
    root = createRoot(host);
    root.render(
      createElement(ToggleBusinessActiveCell, {
        businessId: "b-1",
        isActive,
        corporateReason: "Transportadora Alfa",
      }),
    );
  });

  return host.querySelector('[role="switch"]') as HTMLElement;
}

describe("the active-company switch", () => {
  it("says what it does to which company", async () => {
    expect((await switchOf(true)).getAttribute("aria-label")).toBe(
      "Inativar a empresa Transportadora Alfa",
    );
  });

  it("and the opposite for an inactive company", async () => {
    expect((await switchOf(false)).getAttribute("aria-label")).toBe(
      "Ativar a empresa Transportadora Alfa",
    );
  });
});
