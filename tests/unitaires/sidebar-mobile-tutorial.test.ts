import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Sidebar, SidebarProvider, useSidebar } from "@/components/ui/sidebar";

/**
 * The phone drawer and the guided tour's card.
 *
 * The tour's "Menu de Navegação" step opens this drawer and keeps its card
 * on top of it. The card's focus lands outside the drawer, and Radix closes a
 * modal dialog on focus outside; the card's stopPropagation could not stop it
 * (both listen on the document). Now and then the drawer closed as it opened
 * and the step pointed at nothing (tests/ui/tutorial-tours.spec.ts, phone).
 * Anything else outside still closes it.
 */
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;
let api: ReturnType<typeof useSidebar> | null = null;

const Probe = (): null => {
  api = useSidebar();

  return null;
};

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 390,
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  api = null;
  document.body.innerHTML = "";
});

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function mountOpenDrawer(): Promise<{
  overlayButton: HTMLButtonElement;
  elsewhere: HTMLButtonElement;
}> {
  const host = document.createElement("div");

  document.body.appendChild(host);

  // Stand-ins for the tour's overlay and for any other part of the page.
  const overlay = document.createElement("div");
  overlay.setAttribute("data-tutorial-overlay", "");
  const overlayButton = document.createElement("button");
  overlayButton.textContent = "Próximo";
  overlay.appendChild(overlayButton);
  document.body.appendChild(overlay);

  const elsewhere = document.createElement("button");
  elsewhere.textContent = "Fora";
  document.body.appendChild(elsewhere);

  root = createRoot(host);

  await act(async () =>
    root!.render(
      createElement(
        SidebarProvider,
        null,
        createElement(Probe),
        createElement(
          Sidebar,
          null,
          createElement(
            "a",
            { href: "/dashboard", "data-tutorial": "sidebar-menu" },
            "Dashboard",
          ),
        ),
      ),
    ),
  );
  await settle();

  expect(api!.isMobile, "o teste precisa do layout de celular").toBe(true);

  await act(async () => api!.setOpenMobile(true));
  await settle();

  expect(api!.openMobile).toBe(true);

  return { overlayButton, elsewhere };
}

describe("the phone drawer with the tour on top", () => {
  it("focus on the tour card does not close the drawer", async () => {
    const { overlayButton } = await mountOpenDrawer();

    await act(async () => {
      overlayButton.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      overlayButton.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
    });
    await settle();

    expect(api!.openMobile).toBe(true);
  });

  it("a tap anywhere else still closes it", async () => {
    const { elsewhere } = await mountOpenDrawer();

    await act(async () => {
      elsewhere.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
    });
    await settle();

    expect(api!.openMobile).toBe(false);
  });
});
