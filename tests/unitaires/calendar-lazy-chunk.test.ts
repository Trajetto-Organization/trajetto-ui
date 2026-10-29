import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { LazyCalendar, preloadCalendar } from "@/components/ui/lazy-calendar";

import { clientStaticGraph } from "./helpers/client-graph";

/**
 * The calendar out of the first load (decision of 28/10/2026, spec §16).
 *
 * react-day-picker and the date-fns functions it pulls weigh about 16 KB
 * gzipped. The date fields imported the calendar statically although it only
 * renders inside an open popover, so 23 of the 87 pages — the vehicle,
 * driver, fuel, route and service-order lists among them — shipped it on
 * first load for a field nobody had opened. The fields now render
 * ui/lazy-calendar, which loads it as its own chunk on the way to the click.
 * One static import of `@/components/ui/calendar` puts the weight back on
 * every one of those routes with nothing failing to say so, hence the walk.
 */
(globalThis as { React?: typeof React }).React = React;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const pages = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pages(full);
    return entry.name === "page.tsx"
      ? [path.relative(process.cwd(), full).replace(/\\/g, "/")]
      : [];
  });

const FIELDS = "src/app/(protected)/_components/shared/custom";

describe("react-day-picker in the first load", () => {
  it("is where the calendar is (non-vacuous)", () => {
    expect(
      clientStaticGraph("src/components/ui/calendar.tsx").has(
        "npm:react-day-picker",
      ),
    ).toBe(true);
  });

  it("is in no page's first load: every calendar is a lazy chunk", () => {
    const all = pages(path.join(process.cwd(), "src/app"));

    expect(all).toContain("src/app/(protected)/dashboard/vehicle/page.tsx");
    expect(
      all.filter((page) => clientStaticGraph(page).has("npm:react-day-picker")),
    ).toEqual([]);
  });

  it.each([
    `${FIELDS}/date-picker-field/index.tsx`,
    `${FIELDS}/date-time-picker-field/index.tsx`,
    `${FIELDS}/date-range-picker/index.tsx`,
  ])("%s reaches the calendar only through the lazy import", (field) => {
    const graph = clientStaticGraph(field);

    expect(graph.has("src/components/ui/lazy-calendar.tsx")).toBe(true);
    expect(graph.has("src/components/ui/calendar.tsx")).toBe(false);
    expect(graph.has("npm:react-day-picker")).toBe(false);
  });

  it("is loaded by a dynamic import of the calendar module", () => {
    expect(readFileSync("src/components/ui/lazy-calendar.tsx", "utf8")).toMatch(
      /import\(\s*["']\.\/calendar["']\s*\)/,
    );
  });
});

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

/**
 * Rendered and committed synchronously (effects included): what the first
 * paint shows, before any import could have answered.
 */
function mountCalendar(): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  act(() => {
    root!.render(
      createElement(LazyCalendar, {
        mode: "single",
        loadingClassName: "h-[19rem]",
        defaultMonth: new Date(2026, 9, 1),
      }),
    );
  });

  return host;
}

// In this order: the first mount finds the chunk not loaded yet.
describe("the calendar while its chunk arrives", () => {
  it("first shows a placeholder the grid's size, then the grid", async () => {
    const host = mountCalendar();

    const placeholder = host.querySelector("[data-calendar-loading]");

    expect(placeholder, "o primeiro desenho já tinha o calendário").not.toBe(
      null,
    );
    expect(placeholder!.className).toContain("h-[19rem]");
    expect(placeholder!.getAttribute("role")).toBe("status");
    expect(placeholder!.textContent).toContain("Carregando o calendário");
    expect(host.querySelector('[role="grid"]')).toBeNull();

    await act(async () => {
      await preloadCalendar();
    });

    expect(host.querySelector("[data-calendar-loading]")).toBeNull();
    expect(host.querySelector('[role="grid"]')).not.toBeNull();
  });

  it("opens straight on the grid once the chunk is here", async () => {
    await preloadCalendar();

    const host = mountCalendar();

    // Rendered in the first commit: no placeholder flash on a warm open.
    expect(host.querySelector("[data-calendar-loading]")).toBeNull();
    expect(host.querySelector('[role="grid"]')).not.toBeNull();
  });
});
