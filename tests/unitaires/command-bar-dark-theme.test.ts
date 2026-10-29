import * as React from "react";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The ⌘K palette in the dark theme (review of the wave 4b sweep): the panel
 * and the search were fixed `bg-white`/`text-black`, the item names inherited
 * the dark theme's near-white foreground (white on white), the active row was
 * a fixed `#eeeeee` and the shortcut chip a fixed `bg-slate-100`. Every
 * surface now takes the theme tokens, which both themes define.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock(
  "@/app/(protected)/_components/layout/protected-command-bar-provider/hooks",
  () => ({
    // Two entries in one section, one with a shortcut: enough to render a
    // heading, an active row, an idle row and a chip.
    useCommandBarActions: () => ({
      actions: [
        {
          id: "a",
          name: "Painel",
          section: "Navegação",
          shortcut: ["p"],
          keywords: "",
          perform: () => {},
        },
        {
          id: "b",
          name: "Entregas",
          section: "Navegação",
          shortcut: [],
          keywords: "",
          perform: () => {},
        },
      ],
    }),
  }),
);

import {
  ProtectedCommandBar,
  useCommandPalette,
} from "@/app/(protected)/_components/layout/protected-command-bar-provider";

(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

// Asks the way the header button does: before the palette's chunk is in.
const Opener = (): null => {
  const { toggle } = useCommandPalette();

  useEffect(() => {
    toggle();
  }, [toggle]);

  return null;
};

async function openPalette(): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(
        ProtectedCommandBar,
        { user: { role: "MASTER", permissions: [] } },
        createElement(Opener),
      ),
    );
  });

  // The palette is imported on that ask, then kbar animates in and renders
  // its results on the next frames.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 25)));

    if (document.querySelector('[role="option"]')) break;
  }
}

const FIXED_LIGHT = /\b(bg-white|text-black|bg-slate-100)\b|bg-\[#eeeeee\]/;

// KBarAnimator drops unknown props, so the panel is found from the search
// input it wraps (panel > inner div > input).
const PANEL = "panel";

function classesOf(selector: string): string {
  const element =
    selector === PANEL
      ? (document.querySelector("input")?.parentElement?.parentElement ?? null)
      : document.querySelector(selector);

  expect(element, selector).not.toBeNull();

  return (element as HTMLElement).className;
}

describe("the ⌘K palette in the dark theme", () => {
  it("panel, search, active row and shortcut use theme tokens", async () => {
    await openPalette();

    const panel = classesOf(PANEL);
    const search = classesOf("input");
    const active = classesOf('[role="option"][aria-selected="true"] > div');
    const chip = classesOf('[role="option"] .font-mono');

    for (const className of [panel, search, active, chip]) {
      expect(className).not.toMatch(FIXED_LIGHT);
    }

    expect(panel).toContain("bg-popover");
    expect(panel).toContain("text-popover-foreground");
    expect(search).toContain("text-foreground");
    expect(search).toContain("bg-transparent");
    expect(active).toContain("bg-accent");
    expect(active).toContain("text-accent-foreground");
    expect(chip).toContain("bg-muted");
  });

  it("does not overflow the edge of a 320px phone", async () => {
    await openPalette();

    const panel = classesOf(PANEL).split(/\s+/);

    expect(panel).toContain("w-full");
    expect(panel).not.toContain("w-[35rem]");
  });
});
