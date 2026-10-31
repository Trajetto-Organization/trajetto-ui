import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Puts React in scope for the classic-runtime JSX of the modules below.
import { React } from "./helpers/render-html";

import { AnimatedList, FEED_WINDOW } from "@/components/ui/animated-list";

void React;

/**
 * The auth panel's feed of notifications.
 *
 * It froze on /login while the captcha loaded: in WebKit, Turnstile's iframe
 * runs on the page's main thread, and the list moved by transitioning
 * grid-template-rows (a layout on that thread in every frame), with up to
 * 50 cards and a mass collapse when the loop restarted. Now only transform
 * and opacity move (the compositor's), the list keeps a bounded window, and
 * it wraps around its cards without ever restarting.
 */

const DELAY = 1_400;
const CARDS = ["A", "B", "C", "D", "E"];

let host: HTMLDivElement;
let root: Root;
let reduceMotion = false;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  vi.useFakeTimers();
  reduceMotion = false;
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce") && reduceMotion,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function render() {
  await act(async () => {
    root.render(
      <AnimatedList delay={DELAY}>
        {CARDS.map((card) => (
          <p key={card}>{card}</p>
        ))}
      </AnimatedList>,
    );
  });
}

async function steps(count: number) {
  await act(async () => {
    vi.advanceTimersByTime(DELAY * count);
  });
}

const list = () => host.querySelector<HTMLElement>(".feed-list")!;
const cards = () => [...host.querySelectorAll<HTMLElement>(".feed-card")];
const texts = () => cards().map((card) => card.textContent);

describe("the feed", () => {
  it("starts with one card and adds one at the top every step, up to its window", async () => {
    await render();

    expect(texts()).toEqual(["A"]);

    await steps(1);
    expect(texts()).toEqual(["B", "A"]);

    await steps(FEED_WINDOW);
    expect(cards()).toHaveLength(FEED_WINDOW);
  });

  it("wraps around its cards without ever restarting (no mass collapse)", async () => {
    await render();

    for (let step = 1; step <= CARDS.length * 3; step += 1) {
      await steps(1);

      expect(cards().length).toBe(Math.min(FEED_WINDOW, step + 1));
      expect(texts()[0]).toBe(CARDS[step % CARDS.length]);
    }
  });

  it("keeps each card's node while others come in: only the newest mounts", async () => {
    await render();
    await steps(2);

    const before = cards();

    await steps(1);

    expect(cards().slice(1)).toEqual(before);
  });

  it("slides the list from where the cards were, by transform alone", async () => {
    await render();

    // Each record holds the style before a change: the states the list went
    // through, in order, within the one step.
    const styles: (string | null)[] = [];
    const observer = new MutationObserver((records) =>
      styles.push(...records.map((record) => record.oldValue)),
    );

    observer.observe(list(), {
      attributes: true,
      attributeFilter: ["style"],
      attributeOldValue: true,
    });
    await steps(1);
    styles.push(...observer.takeRecords().map((record) => record.oldValue));
    observer.disconnect();

    // Moved up by the new card (its height, 0 here, plus the gap), with no
    // transition, then let go: the class's transition carries it back.
    expect(
      styles.some((style) => /translateY\(-16px\)/.test(style ?? "")),
    ).toBe(true);
    expect(styles.some((style) => /transition: none/.test(style ?? ""))).toBe(
      true,
    );
    expect(list().style.transform).toBe("");
    expect(list().style.transition).toBe("");
  });

  it("stands still and full with reduced motion", async () => {
    reduceMotion = true;
    await render();

    expect(cards()).toHaveLength(FEED_WINDOW);

    const shown = texts();

    await steps(10);

    expect(texts()).toEqual(shown);
  });
});

describe("its CSS", () => {
  const globals = readFileSync(
    resolve(__dirname, "../../src/app/globals.css"),
    "utf8",
  ).replace(/\r\n/g, "\n");
  const block = (selector: string) =>
    new RegExp(`${selector.replace(/[.]/g, "\\.")} \\{([^}]*)\\}`).exec(
      globals,
    )?.[1] ?? "";

  it("moves only what the compositor animates", () => {
    expect(block(".feed-list")).toMatch(/transition: transform /);
    expect(block(".feed-card")).toMatch(/animation: feed-pop /);

    const keyframes = /@keyframes feed-pop \{([\s\S]*?)\n\}/.exec(globals)?.[1];
    const properties = [...(keyframes ?? "").matchAll(/^\s+([a-z-]+):/gm)].map(
      ([, property]) => property,
    );

    expect(new Set(properties)).toEqual(new Set(["opacity", "transform"]));
  });

  it("no longer animates a layout property", () => {
    expect(globals).not.toMatch(/transition:[^;]*grid-template-rows/);
    expect(globals).not.toMatch(/\.stack-item/);
  });
});
