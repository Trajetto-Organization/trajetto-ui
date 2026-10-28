import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The ⌘K palette loads after the page (docs/arquitetura.md, "Desempenho").
 *
 * kbar used to sit in the first load of every protected page. The palette is
 * now imported when the browser is idle, or on the first ⌘K or button press
 * — and nothing a person does with it may change: ⌘K and the header button
 * open it even before the chunk arrives, kbar alone answers once it is
 * mounted (a press must not toggle twice), and the two-key page shortcuts
 * work as soon as it is.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const perform = vi.fn();
const actionsRead = vi.fn();

vi.mock(
  "@/app/(protected)/_components/layout/protected-command-bar-provider/hooks",
  () => ({
    useCommandBarActions: () => {
      actionsRead();

      return {
        actions: [
          {
            id: "nav:/dashboard/deliveries",
            name: "Entregas",
            section: "Navegação",
            shortcut: ["e", "n"],
            keywords: "",
            perform,
          },
        ],
      };
    },
  }),
);

import { ProtectedCommandBar } from "@/app/(protected)/_components/layout/protected-command-bar-provider";
import { SearchInput } from "@/app/(protected)/_components/layout/protected-search-input";

(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;
let idleCallbacks: Array<() => void> = [];

beforeEach(() => {
  perform.mockClear();
  actionsRead.mockClear();
  idleCallbacks = [];

  // The idle load runs only when a test says the browser is idle.
  vi.stubGlobal("requestIdleCallback", (callback: () => void) => {
    idleCallbacks.push(callback);
    return idleCallbacks.length;
  });
  vi.stubGlobal("cancelIdleCallback", () => undefined);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

function mount(child: React.ReactNode = null): void {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  act(() => {
    root!.render(
      createElement(
        ProtectedCommandBar,
        { user: { role: "MASTER", permissions: [] } },
        child,
      ),
    );
  });
}

const tick = () =>
  act(async () => new Promise((resolve) => setTimeout(resolve, 25)));

async function until(condition: () => boolean, label: string): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (condition()) return;
    await tick();
  }

  throw new Error(`timed out: ${label}`);
}

const APPLE = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

function press(key: string, withMod = false): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    code: `Key${key.toUpperCase()}`,
    ctrlKey: withMod && !APPLE,
    metaKey: withMod && APPLE,
    bubbles: true,
    cancelable: true,
  });

  act(() => {
    document.body.dispatchEvent(event);
  });

  return event;
}

const search = () =>
  document.querySelector<HTMLInputElement>('input[role="combobox"]');

const paletteMounted = () => actionsRead.mock.calls.length > 0;

async function idle(): Promise<void> {
  act(() => {
    for (const callback of idleCallbacks.splice(0)) callback();
  });

  await until(paletteMounted, "palette mounted after idle");
}

describe("the ⌘K palette loads after the page", () => {
  it("mounts nothing of kbar before the idle load or an ask", async () => {
    mount();

    await tick();
    await tick();

    expect(idleCallbacks).toHaveLength(1);
    expect(paletteMounted()).toBe(false);
    expect(search()).toBeNull();
  });

  it("starts the page shortcuts with the idle load", async () => {
    mount();

    // Before: nothing listens for "e n" yet.
    press("e");
    press("n");
    expect(perform).not.toHaveBeenCalled();

    await idle();

    press("e");
    press("n");

    expect(perform).toHaveBeenCalledTimes(1);
    // A page shortcut navigates; it does not open the palette.
    expect(search()).toBeNull();
  });

  it("opens on ⌘K pressed before the chunk arrives", async () => {
    mount();

    const event = press("k", true);

    // The browser's own Ctrl+K (the address bar search) is not triggered.
    expect(event.defaultPrevented).toBe(true);

    // Mounted while animating in, then shown (kbar's own timer).
    await until(
      () => search()?.getAttribute("aria-expanded") === "true",
      "palette shown",
    );
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it("still opens when ⌘K is pressed twice while the chunk loads", async () => {
    mount();

    press("k", true);
    press("k", true);

    await until(() => search() !== null, "palette open");
    // Settled open, not opened and closed again.
    await tick();
    await tick();

    expect(search()).not.toBeNull();
  });

  it("lets kbar alone answer ⌘K once mounted: one press opens, the next closes", async () => {
    mount();

    await idle();

    press("k", true);
    await until(() => search() !== null, "palette open");

    // Settled: a second handler toggling the same press would close it here.
    await tick();
    await tick();
    expect(search()).not.toBeNull();

    press("k", true);
    await until(() => search() === null, "palette closed");
  });

  it("opens from the header button and closes on Escape", async () => {
    mount(createElement(SearchInput));

    const button = document.querySelector<HTMLButtonElement>(
      'button[data-tutorial="search"]',
    );

    expect(button).not.toBeNull();

    act(() => {
      button!.click();
    });

    await until(() => search() !== null, "palette open");

    press("Escape");

    await until(() => search() === null, "palette closed");
  });
});
