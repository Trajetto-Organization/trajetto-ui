import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Sidebar, SidebarProvider, useSidebar } from "@/components/ui/sidebar";

/**
 * The phone drawer reopened while it is still closing.
 *
 * Radix portals the drawer's overlay and its panel separately (each appended
 * to <body> on mount, both z-50), so DOM order decides which paints on top.
 * The overlay used to finish its exit (150ms) before the panel (300ms):
 * reopening in between (Ctrl+B pressed twice, a quick tap) mounted a fresh
 * overlay AFTER the panel that was still there, and the overlay covered the
 * menu until a tap on it closed the drawer.
 *
 * Real SidebarProvider + Sidebar + Radix Presence. happy-dom runs no CSS
 * animations, so a stylesheet gives each state an animation name and the
 * test fires `animationend` in the order the real durations would.
 */
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { React?: typeof React }).React = React;

// tailwindcss-animate's default when no duration utility applies.
const DEFAULT_ANIMATION_MS = 150;

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
  const style = document.createElement("style");
  style.textContent =
    '[data-state="open"] { animation-name: enter; } [data-state="closed"] { animation-name: exit; }';
  document.head.appendChild(style);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  api = null;
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function mountDrawer(): Promise<void> {
  const host = document.createElement("div");

  document.body.appendChild(host);
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
          createElement("a", { href: "/dashboard" }, "Dashboard"),
        ),
      ),
    ),
  );
  await settle();

  expect(api!.isMobile, "needs the phone layout").toBe(true);
}

// Selectors that hold for the old SheetContent markup and the new one.
const panel = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    '[data-mobile="true"][data-sidebar="sidebar"]',
  );
const overlay = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[class*="bg-black/80"]');

function closedDurationMs(element: HTMLElement): number {
  const match = element.className.match(/data-\[state=closed\]:duration-(\d+)/);

  return match ? Number(match[1]) : DEFAULT_ANIMATION_MS;
}

async function endExit(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new AnimationEvent("animationend", { animationName: "exit" }),
    );
  });
  await settle();
}

describe("the phone drawer reopened during its close animation", () => {
  it("the overlay's exit lasts at least as long as the panel's", async () => {
    await mountDrawer();
    await act(async () => api!.setOpenMobile(true));
    await settle();

    expect(closedDurationMs(overlay()!)).toBeGreaterThanOrEqual(
      closedDurationMs(panel()!),
    );
  });

  it("keeps the panel above the overlay when reopened between the two exits", async () => {
    await mountDrawer();
    await act(async () => api!.setOpenMobile(true));
    await settle();

    const firstOverlay = overlay()!;
    const firstPanel = panel()!;

    await act(async () => api!.setOpenMobile(false));
    await settle();

    expect(firstPanel.getAttribute("data-state")).toBe("closed");
    expect(
      firstOverlay.isConnected,
      "Presence keeps the overlay for its exit",
    ).toBe(true);

    // The shorter exit finishes first, exactly as in the browser.
    const [first, second] =
      closedDurationMs(firstOverlay) < closedDurationMs(firstPanel)
        ? [firstOverlay, firstPanel]
        : [firstPanel, firstOverlay];

    await endExit(first);

    expect(first.isConnected).toBe(false);
    expect(second.isConnected).toBe(true);

    await act(async () => api!.setOpenMobile(true));
    await settle();

    const reopenedOverlay = overlay()!;
    const reopenedPanel = panel()!;

    expect(reopenedPanel.getAttribute("data-state")).toBe("open");
    expect(reopenedOverlay.getAttribute("data-state")).toBe("open");
    expect(
      reopenedOverlay.compareDocumentPosition(reopenedPanel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      "the panel must come after the overlay in the DOM to paint above it",
    ).toBeTruthy();
  });
});
