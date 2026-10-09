import * as React from "react";
import { createElement, type ReactElement, type ReactNode } from "react";

import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import {
  JumpToLatestButton,
  MESSAGE_LIST_FAB_INSET_CLASS,
  NewerMessagesButton,
} from "@/features/deliveries/chat/jump-to-latest-button";

import {
  BROWSER_STEP_TIMEOUT_MS,
  hasChromium,
  measureInChromium,
} from "./helpers/measure-in-chromium";

/**
 * "Ir para a última mensagem" never sits on "Mensagens mais recentes"
 * (DLV-CHAT-1, the chat print of Entregas 7), measured in a real browser.
 *
 * Both show whenever the window is in the past. The jump was a pill centred
 * at the bottom of the pane and the inline button is centred at the end of
 * the list, so scrolled to the end one covered the other. Class names cannot
 * prove two boxes do not intersect; Chromium can, at every scroll position.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

/** The pane as conversation.tsx lays it out: a relative box over a scroller. */
function pane(listInsetClass: string, floating: ReactNode): ReactElement {
  const rows = Array.from({ length: 24 }, (_, index) =>
    createElement(
      "div",
      { key: index, className: "h-10 rounded-2xl bg-muted" },
      `mensagem ${index}`,
    ),
  );

  return createElement(
    "div",
    { className: "flex h-[420px] min-w-0 flex-col" },
    createElement(
      "div",
      { className: "relative min-h-0 flex-1" },
      createElement(
        "div",
        { className: "h-full overflow-y-auto px-4 py-4", "data-scroller": "" },
        createElement(
          "div",
          { className: `space-y-1.5 ${listInsetClass}` },
          ...rows,
          createElement(NewerMessagesButton, {
            key: "newer",
            isLoading: false,
            disabled: false,
            onLoad: () => undefined,
          }),
        ),
      ),
      floating,
    ),
  );
}

/** The pill as it was: centred, `bottom-3`, text inside. */
const legacyPill = createElement(
  "div",
  {
    className:
      "pointer-events-none absolute inset-x-0 bottom-3 flex justify-center",
  },
  createElement(
    Button,
    {
      type: "button",
      size: "sm",
      variant: "secondary",
      className:
        "pointer-events-auto h-8 gap-1.5 rounded-full border shadow-md",
      "data-chat-jump-to-latest": "",
    } as never,
    "Ir para a última mensagem",
  ),
);

/** Runs IN the page: does the jump ever cover the inline button? */
function overlapsAtAnyScroll(): { overlaps: boolean; positions: number } {
  const scroller = document.querySelector<HTMLElement>("[data-scroller]")!;
  const jump = document.querySelector<HTMLElement>(
    "[data-chat-jump-to-latest]",
  )!;
  const newer = document.querySelector<HTMLElement>("[data-chat-load-newer]")!;

  const max = scroller.scrollHeight - scroller.clientHeight;
  let positions = 0;
  let overlaps = false;

  for (let top = 0; top <= max + 8; top += 8) {
    scroller.scrollTop = Math.min(top, max);
    positions += 1;

    const a = jump.getBoundingClientRect();
    const b = newer.getBoundingClientRect();

    // Only what is inside the scroller's viewport can be covered.
    const view = scroller.getBoundingClientRect();
    const visible = b.bottom > view.top && b.top < view.bottom;

    const intersect =
      a.left < b.right &&
      b.left < a.right &&
      a.top < b.bottom &&
      b.top < a.bottom;

    if (visible && intersect) overlaps = true;
  }

  return { overlaps, positions };
}

describe.skipIf(!hasChromium)(
  `the way back to the end of the chat${hasChromium ? "" : " — skipped: Chromium is not installed"}`,
  () => {
    const jump = createElement(JumpToLatestButton, {
      heldCount: 3,
      isJumping: false,
      disabled: false,
      onJump: () => undefined,
    });

    for (const width of [320, 390, 1024]) {
      it(
        `does not cover "Mensagens mais recentes" at ${width}px`,
        async () => {
          const result = await measureInChromium(
            pane(MESSAGE_LIST_FAB_INSET_CLASS, jump),
            overlapsAtAnyScroll,
            { width, height: 700 },
          );

          expect(result.positions).toBeGreaterThan(10);
          expect(result.overlaps).toBe(false);
        },
        BROWSER_STEP_TIMEOUT_MS,
      );
    }

    it(
      "did cover it with the centred pill (the reported print)",
      async () => {
        const result = await measureInChromium(
          pane("", legacyPill),
          overlapsAtAnyScroll,
          { width: 390, height: 700 },
        );

        expect(result.overlaps).toBe(true);
      },
      BROWSER_STEP_TIMEOUT_MS,
    );
  },
);

describe("the jump's accessible name", () => {
  it("says where it goes and how many messages are waiting", async () => {
    const { createRoot } = await import("react-dom/client");
    const { act } = await import("react");

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        createElement(JumpToLatestButton, {
          heldCount: 2,
          isJumping: false,
          disabled: false,
          onJump: () => undefined,
        }),
      );
    });

    const button = host.querySelector("button")!;

    expect(button.getAttribute("aria-label")).toBe(
      "Ir para a última mensagem — 2 mensagens novas",
    );
    expect(button.getAttribute("title")).toBe(
      button.getAttribute("aria-label"),
    );

    await act(async () => root.unmount());
    host.remove();
  });
});
