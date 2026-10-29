import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AboutStats } from "@/components/about/stats";
import { AppOffline } from "@/components/site/app-page/offline-demo";
import { HomeAI, HomeDriverApp, HomeModules } from "@/components/site/home";
import { ProductApp } from "@/components/site/product/product-app";
import { ProductDemo } from "@/components/site/product/product-demo";

/**
 * The public pages' drawings of the product, mounted in a DOM: what a
 * keyboard can reach in them, and what moves by itself.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

// next/image needs Next's loader and blur data; a plain <img> is enough.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string | { src: string }; alt: string }) =>
    React.createElement("img", {
      src: typeof src === "string" ? src : src.src,
      alt,
    }),
}));

let host: HTMLDivElement;
let root: Root;
let reduceMotion = false;
let onScreen = true;

/** The browser APIs the components listen to, answered on purpose. */
function stubBrowser() {
  class Observer {
    constructor(private readonly callback: IntersectionObserverCallback) {}

    observe(target: Element) {
      this.callback(
        [{ isIntersecting: onScreen, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }

    disconnect() {}

    unobserve() {}
  }

  class Resize {
    observe() {}

    unobserve() {}

    disconnect() {}
  }

  vi.stubGlobal("IntersectionObserver", Observer);
  vi.stubGlobal("ResizeObserver", Resize);
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches:
          query.includes("prefers-reduced-motion: reduce") && reduceMotion,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
  window.matchMedia = globalThis.matchMedia;
}

async function mount(element: React.ReactElement) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root.render(element);
  });
}

async function wait(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  reduceMotion = false;
  onScreen = true;
  vi.useFakeTimers();
  stubBrowser();
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/**
 * The props React attached to a DOM node. The handler is what makes a
 * button a control; server-rendered markup cannot show it, so this reads
 * it where React keeps it.
 */
function reactProps(element: Element): Record<string, unknown> | undefined {
  const key = Object.keys(element).find((name) =>
    name.startsWith("__reactProps$"),
  );
  return key
    ? (element as unknown as Record<string, Record<string, unknown>>)[key]
    : undefined;
}

/**
 * The interactive islands of the public pages. The old landing demo kept
 * buttons that did nothing and listened for Space and the arrows on the
 * window whatever had focus (Space on a FAQ question started its tour, the
 * page stopped scrolling with Space). Each island now owns its keys.
 */
const ISLANDS: [string, () => React.ReactElement][] = [
  ["the landing's modules", () => React.createElement(HomeModules)],
  ["the landing's driver app", () => React.createElement(HomeDriverApp)],
  ["the landing's AI demo", () => React.createElement(HomeAI)],
  [
    "the fleet page's app tabs",
    () => React.createElement(ProductApp, { module: "frotas" }),
  ],
  [
    "the delivery page's app tabs",
    () => React.createElement(ProductApp, { module: "entregas" }),
  ],
  [
    "the fleet page's demo",
    () => React.createElement(ProductDemo, { module: "frotas" }),
  ],
  [
    "the delivery page's demo",
    () => React.createElement(ProductDemo, { module: "entregas" }),
  ],
  ["the driver app page's offline demo", () => React.createElement(AppOffline)],
];

describe.each(ISLANDS)("%s", (_name, island) => {
  const HANDLERS = ["onClick", "onKeyDown", "onChange"];

  it("lets the keyboard reach only controls that do something, each with a name", async () => {
    await mount(island());

    const reachable = Array.from(
      host.querySelectorAll<HTMLElement>(
        "a[href], button, input, select, textarea, [tabindex]",
      ),
    ).filter(
      (element) =>
        element.tabIndex >= 0 && !(element as HTMLButtonElement).disabled,
    );

    // A link goes somewhere, and a tab panel is a stop on purpose (WAI-ARIA
    // tabs: the panel takes focus when it holds no control); anything else
    // needs a handler of its own.
    const dead = reachable
      .filter(
        (element) =>
          element.tagName !== "A" &&
          element.getAttribute("role") !== "tabpanel",
      )
      .filter(
        (element) =>
          !HANDLERS.some(
            (name) => typeof reactProps(element)?.[name] === "function",
          ),
      )
      .map((element) => element.outerHTML.slice(0, 80));
    expect(dead).toEqual([]);

    for (const element of reachable) {
      const labelledBy = element.getAttribute("aria-labelledby");
      const name =
        element.getAttribute("aria-label") ||
        (labelledBy &&
          host
            .querySelector(`#${CSS.escape(labelledBy)}`)
            ?.textContent?.trim()) ||
        element.textContent?.trim() ||
        element.closest("label")?.textContent?.trim();
      expect(name, element.outerHTML.slice(0, 80)).toBeTruthy();
    }
  });

  it("leaves Space and the arrows to the page when focus is elsewhere", async () => {
    await mount(island());
    const before = host.innerHTML;

    for (const key of [" ", "ArrowRight", "ArrowDown", "End"]) {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      await act(async () => {
        document.body.dispatchEvent(event);
      });
      expect(event.defaultPrevented, key).toBe(false);
    }

    expect(host.innerHTML).toBe(before);
  });
});

describe("the about page's figures", () => {
  it("show the real value until the count starts, not zero", async () => {
    onScreen = false;
    await mount(React.createElement(AboutStats));

    const text = host.textContent ?? "";
    expect(text).toContain("100%");
    expect(text).toContain("7 dias");
    expect(text).not.toMatch(/\b0%/);
  });
});

/**
 * The landing's driver-app section steps through the app's screens by
 * itself (the design's 4.8s), but only while someone can watch it and has
 * not asked for less motion, and it lets go as soon as a visitor reaches
 * for the list.
 */
describe("the landing's driver-app steps", () => {
  const STEP = 4800;

  const selected = () =>
    host.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? "";
  const tabs = () =>
    Array.from(host.querySelectorAll<HTMLElement>('[role="tab"]'));

  async function press(target: Element, key: string) {
    await act(async () => {
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
    });
  }

  it("moves by itself while on screen, and the phone follows", async () => {
    await mount(React.createElement(HomeDriverApp));
    const first = selected();
    const phone = host
      .querySelector('[role="tabpanel"] [role="img"]')
      ?.getAttribute("aria-label");

    await wait(STEP);

    expect(selected()).not.toBe(first);
    expect(
      host
        .querySelector('[role="tabpanel"] [role="img"]')
        ?.getAttribute("aria-label"),
    ).not.toBe(phone);
  });

  it("stands still for a visitor who asked for less motion", async () => {
    reduceMotion = true;
    await mount(React.createElement(HomeDriverApp));
    const first = selected();

    await wait(STEP * 3);

    expect(selected()).toBe(first);
    expect(first).toContain("Entregas do dia");
  });

  it("stands still while off screen", async () => {
    onScreen = false;
    await mount(React.createElement(HomeDriverApp));
    const first = selected();

    await wait(STEP * 3);

    expect(selected()).toBe(first);
  });

  it("holds while focus is in the list", async () => {
    await mount(React.createElement(HomeDriverApp));
    const first = selected();

    await act(async () => tabs()[0].focus());
    await wait(STEP * 2);

    expect(selected()).toBe(first);
  });

  it("is a tab list the arrows drive, with one tab in the tab order", async () => {
    await mount(React.createElement(HomeDriverApp));

    expect(tabs()).toHaveLength(5);
    expect(tabs().filter((tab) => tab.tabIndex === 0)).toHaveLength(1);

    await act(async () => tabs()[0].focus());
    await press(tabs()[0], "ArrowDown");
    expect(selected()).toContain("Comprovante");
    expect(document.activeElement).toBe(tabs()[1]);

    await press(tabs()[1], "End");
    expect(selected()).toContain("Checklist");

    await press(tabs()[4], "ArrowDown");
    expect(selected()).toContain("Entregas do dia");

    // The visitor took over: no more stepping, even after focus leaves.
    await act(async () => (document.activeElement as HTMLElement).blur());
    await wait(STEP * 2);
    expect(selected()).toContain("Entregas do dia");
  });
});

describe("the landing's AI demo", () => {
  it("shows the finished analysis, still, under reduced motion", async () => {
    reduceMotion = true;
    await mount(React.createElement(HomeAI));
    const panel = () =>
      host.querySelector('[role="tabpanel"]')?.textContent ?? "";
    const first = panel();

    await wait(950 * 20);

    expect(panel()).toBe(first);
    expect(first.match(/\(concluído\)/g)).toHaveLength(4);
  });

  it("ticks the steps off one by one while on screen", async () => {
    await mount(React.createElement(HomeAI));
    const done = () =>
      (
        host
          .querySelector('[role="tabpanel"]')
          ?.textContent?.match(/\(concluído\)/g) ?? []
      ).length;

    expect(done()).toBe(0);
    await wait(950 * 2);
    expect(done()).toBe(2);
  });
});
