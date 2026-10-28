import * as React from "react";
import { act, createElement, type ElementType, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * One overflowing strip for the whole product (decision 3.1).
 *
 * The user's reference is Entregas: one line, no operating-system scrollbar,
 * a faded edge with an arrow on each side that still hides something. /admin
 * and /dashboard used a bare `overflow-x-auto` (horizontal AND vertical bar on
 * Windows), Integrações wrapped onto a second line, and the filter chips of
 * three panels wrapped too. These tests render the real components and check
 * the rail itself: the arrows appear from real scroll measurements, the lists
 * never wrap, the native bar is hidden and vertical overflow is clipped.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/link", async () => {
  const { createElement: h, forwardRef } = await import("react");

  return {
    default: forwardRef<HTMLAnchorElement, Record<string, unknown>>(
      ({ href, children, ...rest }, ref) =>
        h("a", { ...rest, href: String(href), ref }, children as never),
    ),
  };
});

import {
  centeredScrollLeft,
  readScrollEdges,
  scrollStep,
} from "@/components/ui/scrollable-tabs";
import {
  MIN_FILLING_SECTIONS,
  SegmentedNav,
} from "@/components/ui/segmented-nav";
import { ScrollableTabsList, Tabs, TabsTrigger } from "@/components/ui/tabs";
import { FilterChips } from "@/components/shared/custom/filter-chips";

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

/** Gives an element the scroll geometry a browser would, then scrolls it. */
async function overflow(
  element: HTMLElement,
  {
    clientWidth,
    scrollWidth,
    scrollLeft = 0,
  }: {
    clientWidth: number;
    scrollWidth: number;
    scrollLeft?: number;
  },
): Promise<void> {
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    value: clientWidth,
  });
  Object.defineProperty(element, "scrollWidth", {
    configurable: true,
    value: scrollWidth,
  });

  element.scrollLeft = scrollLeft;

  await act(async () => {
    element.dispatchEvent(new Event("scroll"));
  });
}

const SECTIONS = [
  { value: "api-keys", label: "Chaves de API", dataTutorial: "tab-api-keys" },
  { value: "webhooks", label: "Webhooks" },
  { value: "monitor", label: "Monitor de envios" },
  { value: "usage", label: "Uso da API" },
];

describe("the track measurements", () => {
  it("only lights an edge when there is hidden content on that side", () => {
    expect(
      readScrollEdges({ scrollLeft: 0, clientWidth: 300, scrollWidth: 300 }),
    ).toEqual({ left: false, right: false });

    expect(
      readScrollEdges({ scrollLeft: 0, clientWidth: 300, scrollWidth: 800 }),
    ).toEqual({ left: false, right: true });

    expect(
      readScrollEdges({ scrollLeft: 500, clientWidth: 300, scrollWidth: 800 }),
    ).toEqual({ left: true, right: false });

    // Half a pixel from either end is "at the end": fractional widths must
    // not keep an arrow flickering.
    expect(
      readScrollEdges({
        scrollLeft: 0.5,
        clientWidth: 300,
        scrollWidth: 800.5,
      }),
    ).toEqual({ left: false, right: true });
  });

  it("an arrow moves a good part of the screen, never less than 160px", () => {
    expect(scrollStep(200)).toBe(160);
    expect(scrollStep(1000)).toBe(600);
  });

  it("centres the active item without going past the start", () => {
    expect(
      centeredScrollLeft(
        { scrollLeft: 0, clientWidth: 400, left: 0 },
        { left: 900, width: 100 },
      ),
    ).toBe(750);

    expect(
      centeredScrollLeft(
        { scrollLeft: 0, clientWidth: 400, left: 0 },
        { left: 20, width: 100 },
      ),
    ).toBe(0);
  });
});

describe("SegmentedNav", () => {
  it("with fill={false} (Integrações) scrolls on one line instead of wrapping into two", async () => {
    const host = await mount(
      createElement(SegmentedNav, {
        items: SECTIONS,
        activeValue: "webhooks",
        hrefFor: (value: string) => `?tab=${value}`,
        label: "Seções de integrações",
        fill: false,
        dataTutorial: "integrations-tabs",
      }),
    );

    const list = host.querySelector("ul")!;
    const classes = list.className.split(/\s+/);

    expect(classes).not.toContain("flex-wrap");
    expect(classes).not.toContain("min-h-10");
    expect(classes).toEqual(
      expect.arrayContaining([
        "h-10",
        "scrollbar-none",
        "overflow-x-auto",
        "overflow-y-hidden",
      ]),
    );
  });

  it("filling (Entregas, Torre) shares the whole rail: no ceiling per section, never below its label", async () => {
    /*
      A 256px ceiling per section left bare track after the last tab once
      Entregas went from ten sections to six and the Torre had five: 216px
      at 1920px with the sidebar collapsed, 264px on the Torre with it open.
      The geometry itself is measured in tests/responsive/tab-strip-fill;
      this pins the rule that produces it.
    */
    const host = await mount(
      createElement(SegmentedNav, {
        items: SECTIONS,
        activeValue: "webhooks",
        hrefFor: (value: string) => `?tab=${value}`,
        label: "Seções de entregas",
      }),
    );

    const navs = host.querySelectorAll("nav");
    const desk = [...navs].find((nav) => nav.querySelector("ul"))!;

    expect(desk.className.split(/\s+/)).toContain("w-full");

    const items = [...desk.querySelectorAll("ul > li")];

    expect(items).toHaveLength(SECTIONS.length);

    for (const item of items) {
      const classes = item.className.split(/\s+/);

      // Same extra pixels for every section: the label-to-label spacing
      // stays constant (not equal columns, which crowd the long labels).
      expect(classes).toContain("flex-auto");
      expect(classes).toContain("min-w-max");
      expect(classes).not.toContain("flex-1");
      expect(classes.filter((name) => name.startsWith("max-w-"))).toEqual([]);
    }
  });

  it("filling with one or two sections hugs instead of stretching them across the rail", async () => {
    /*
      A profile with only `occurrence_manage` sees one section on Entregas and
      one view on the Torre. Filling made that one section a ~1550px pill at
      1920px (§4: no disproportionate stretching). The responsive suite
      measures the geometry; this pins the rule.
    */
    expect(MIN_FILLING_SECTIONS).toBe(3);

    for (const count of [1, 2]) {
      const items = SECTIONS.slice(0, count);
      const host = await mount(
        createElement(SegmentedNav, {
          items,
          activeValue: items[0].value,
          hrefFor: (value: string) => `?tab=${value}`,
          label: "Seções de entregas",
        }),
      );

      const desk = [...host.querySelectorAll("nav")].find((nav) =>
        nav.querySelector("ul"),
      )!;

      expect(desk.className.split(/\s+/), `${count} seção(ões)`).toContain(
        "w-fit",
      );
      expect(desk.className.split(/\s+/)).not.toContain("w-full");

      const listItems = [...desk.querySelectorAll("ul > li")];

      expect(listItems).toHaveLength(count);

      for (const item of listItems) {
        const classes = item.className.split(/\s+/);

        expect(classes).toContain("min-w-max");
        expect(classes).not.toContain("flex-auto");
      }

      // The rail itself is unchanged: one line, its own scroll and arrows.
      expect(desk.querySelector("ul")!.className.split(/\s+/)).toEqual(
        expect.arrayContaining(["h-10", "overflow-x-auto", "scrollbar-none"]),
      );

      await act(async () => root?.unmount());
      root = null;
      document.body.innerHTML = "";
    }
  });

  it("filling from three sections up shares the rail, as with five or six", async () => {
    const items = SECTIONS.slice(0, MIN_FILLING_SECTIONS);
    const host = await mount(
      createElement(SegmentedNav, {
        items,
        activeValue: items[0].value,
        hrefFor: (value: string) => `?tab=${value}`,
        label: "Seções de entregas",
      }),
    );

    const desk = [...host.querySelectorAll("nav")].find((nav) =>
      nav.querySelector("ul"),
    )!;

    expect(desk.className.split(/\s+/)).toContain("w-full");

    for (const item of desk.querySelectorAll("ul > li")) {
      expect(item.className.split(/\s+/)).toContain("flex-auto");
    }
  });

  it("with fill={false} the sections keep their own width", async () => {
    const host = await mount(
      createElement(SegmentedNav, {
        items: SECTIONS,
        activeValue: "webhooks",
        hrefFor: (value: string) => `?tab=${value}`,
        label: "Seções de integrações",
        fill: false,
      }),
    );

    const desk = [...host.querySelectorAll("nav")].find((nav) =>
      nav.querySelector("ul"),
    )!;

    expect(desk.className.split(/\s+/)).toContain("w-fit");

    for (const item of desk.querySelectorAll("ul > li")) {
      const classes = item.className.split(/\s+/);

      expect(classes).toContain("min-w-max");
      expect(classes).not.toContain("flex-auto");
      expect(classes.filter((name) => name.startsWith("max-w-"))).toEqual([]);
    }
  });

  it("shows the arrows when the sections do not fit, and only on the side that hides something", async () => {
    const host = await mount(
      createElement(SegmentedNav, {
        items: SECTIONS,
        activeValue: "api-keys",
        hrefFor: (value: string) => `?tab=${value}`,
        label: "Seções de integrações",
        fill: false,
      }),
    );

    const list = host.querySelector("ul")!;

    expect(host.querySelector("[data-scroll-edge]")).toBeNull();

    await overflow(list, { clientWidth: 300, scrollWidth: 540 });

    expect(host.querySelector('[data-scroll-edge="right"]')).not.toBeNull();
    expect(host.querySelector('[data-scroll-edge="left"]')).toBeNull();

    await overflow(list, {
      clientWidth: 300,
      scrollWidth: 540,
      scrollLeft: 240,
    });

    expect(host.querySelector('[data-scroll-edge="left"]')).not.toBeNull();
    expect(host.querySelector('[data-scroll-edge="right"]')).toBeNull();
  });

  it("the faded edge covers the track to the end, without letting the next tab leak behind the arrow", async () => {
    // The rail's p-1 belongs to its scrollport: an overlay inset 4px from the
    // edge let the next label show past the arrow (/admin/deliveries, 1440px).
    const host = await mount(
      createElement(SegmentedNav, {
        items: SECTIONS,
        activeValue: "webhooks",
        hrefFor: (value: string) => `?tab=${value}`,
        label: "Seções de integrações",
        fill: false,
      }),
    );

    const list = host.querySelector("ul")!;

    await overflow(list, {
      clientWidth: 300,
      scrollWidth: 540,
      scrollLeft: 100,
    });

    const left = host
      .querySelector('[data-scroll-edge="left"]')!
      .className.split(/\s+/);
    const right = host
      .querySelector('[data-scroll-edge="right"]')!
      .className.split(/\s+/);

    expect(left).toContain("left-0");
    expect(left).toContain("inset-y-0");
    expect(left).not.toContain("left-1");
    expect(right).toContain("right-0");
    expect(right).toContain("inset-y-0");
    expect(right).not.toContain("right-1");
  });

  it("does not repeat the tutorial anchor on the phone's hidden button", async () => {
    const host = await mount(
      createElement(SegmentedNav, {
        items: SECTIONS,
        activeValue: "api-keys",
        hrefFor: (value: string) => `?tab=${value}`,
        label: "Seções de entregas",
        dataTutorial: "deliveries-tabs",
      }),
    );

    // The phone button comes first in the DOM and is display:none on a desk;
    // sharing the anchor made the tour spotlight a 0x0 box.
    const anchors = host.querySelectorAll('[data-tutorial="deliveries-tabs"]');

    expect(anchors).toHaveLength(1);
    expect(anchors[0].tagName).toBe("UL");

    expect(
      host.querySelector('[data-tutorial="deliveries-tabs-mobile"]')?.tagName,
    ).toBe("BUTTON");

    expect(
      host.querySelectorAll('[data-tutorial="tab-api-keys"]'),
    ).toHaveLength(1);
  });
});

describe("ScrollableTabsList (overview of /admin and /dashboard)", () => {
  async function mountTabs(): Promise<HTMLElement> {
    return mount(
      createElement(
        Tabs,
        { defaultValue: "overview" },
        createElement(
          // `data-*` is valid on the DOM element but unknown to the props type.
          ScrollableTabsList as ElementType,
          {
            "data-tutorial": "dashboard-tabs",
            className: "justify-center overflow-x-auto",
          },
          createElement(TabsTrigger, { value: "overview" }, "Overview"),
          createElement(TabsTrigger, { value: "charts" }, "Análise Gráfica"),
          createElement(TabsTrigger, { value: "limits" }, "Limites de Uso"),
        ),
      ),
    );
  }

  it("hides the native bar and cuts vertical scrolling, even if the caller asks for overflow-x-auto", async () => {
    const host = await mountTabs();

    const list = host.querySelector('[role="tablist"]')!;
    const classes = list.className.split(/\s+/);

    expect(classes).toEqual(
      expect.arrayContaining([
        "h-10",
        "scrollbar-none",
        "overflow-y-hidden",
        "flex-nowrap",
        // A centred list clips its first tab where no scroll can reach.
        "justify-start",
      ]),
    );
    expect(classes).not.toContain("justify-center");
  });

  it("keeps role=tablist and the tutorial anchor on the list itself", async () => {
    const host = await mountTabs();

    const list = host.querySelector('[data-tutorial="dashboard-tabs"]')!;

    expect(list.getAttribute("role")).toBe("tablist");
    expect(list.querySelectorAll('[role="tab"]')).toHaveLength(3);
  });

  it("gets the arrows when the tabs do not fit", async () => {
    const host = await mountTabs();

    const list = host.querySelector('[role="tablist"]') as HTMLElement;

    await overflow(list, { clientWidth: 200, scrollWidth: 420 });

    expect(host.querySelector('[data-scroll-edge="right"]')).not.toBeNull();
  });
});

describe("FilterChips (Monitor de envios, Uso da API, Auditoria)", () => {
  async function mountChips(): Promise<HTMLElement> {
    return mount(
      createElement(FilterChips<"all" | "failed" | "queued" | "delivered">, {
        label: "Situação",
        value: "failed",
        options: [
          { value: "all", label: "Todos" },
          { value: "failed", label: "Falharam", count: 3 },
          { value: "queued", label: "Na fila", count: 12 },
          { value: "delivered", label: "Entregues", count: 1024 },
        ],
        onChange: () => {},
      }),
    );
  }

  it("stay on a single line, on the pattern's track, without wrapping", async () => {
    const host = await mountChips();

    const group = host.querySelector('[role="group"]')!;
    const classes = group.className.split(/\s+/);

    expect(group.getAttribute("aria-label")).toBe("Situação");
    expect(classes).not.toContain("flex-wrap");
    expect(classes).toEqual(
      expect.arrayContaining([
        "flex-nowrap",
        "scrollbar-none",
        "overflow-y-hidden",
      ]),
    );

    // Still toggles, exactly one pressed.
    expect(group.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
  });

  it("show the arrows when they do not fit on a phone", async () => {
    const host = await mountChips();

    const group = host.querySelector('[role="group"]') as HTMLElement;

    await overflow(group, { clientWidth: 240, scrollWidth: 380 });

    expect(host.querySelector('[data-scroll-edge="right"]')).not.toBeNull();
  });
});
