import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Puts React in scope for the classic-runtime JSX below.
import { React, renderHtml } from "./helpers/render-html";

import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarRail,
  SidebarScrollArea,
} from "@/components/ui/sidebar";

void React;

/**
 * The sidebar menu's scrollbar under the pointer.
 *
 * Radix draws the bar over the viewport's right edge: the items ran under it
 * (worse, its display:table wrapper grew past the viewport to fit the widest
 * label), and the rail, centred on the panel's edge, covered the last 8px of
 * it. Grabbing the thumb collapsed the sidebar or opened a link. The browser
 * check of the same contract is tests/ui/sidebar-drawer-scrollbar.spec.ts.
 */

const SRC = resolve(__dirname, "../../src");
const read = (path: string) => readFileSync(resolve(SRC, path), "utf8");

function classOf(html: string, marker: string): string {
  const tag = html.match(new RegExp(`<[^>]*${marker}[^>]*>`))?.[0] ?? "";

  return (tag.match(/class="([^"]*)"/)?.[1] ?? "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

const html = renderHtml(
  <SidebarProvider>
    <Sidebar collapsible="icon">
      <SidebarScrollArea data-sidebar-menu>
        <SidebarContent>menu</SidebarContent>
      </SidebarScrollArea>
      <SidebarRail />
    </Sidebar>
  </SidebarProvider>,
);

describe("the sidebar menu's scroll area", () => {
  const area = classOf(html, "data-sidebar-menu");

  it("gives the vertical bar a wide hit area with a thin thumb at rest", () => {
    expect(area).toContain("[&>[data-orientation=vertical]]:w-3.5");
    expect(area).toContain("[&>[data-orientation=vertical]]:p-[5px]");
    expect(area).toContain("[&>[data-orientation=vertical]:hover]:p-[3px]");
    expect(area).toContain("[&>[data-orientation=vertical]:active]:p-[3px]");
  });

  it("keeps a gutter as wide as the bar so no item sits under it", () => {
    // 6px on top of the group's 8px = the bar's 14px.
    expect(area).toContain(
      "[&:has(>[data-orientation=vertical])_[data-sidebar=content]]:pr-1.5",
    );
    expect(area).toContain("[&>[data-radix-scroll-area-viewport]>div]:!block");
  });

  it("shrinks the bar into the icon column's free 8px when collapsed", () => {
    expect(area).toContain(
      "group-data-[collapsible=icon]:[&>[data-orientation=vertical]]:w-2",
    );
    expect(area).toContain(
      "group-data-[collapsible=icon]:[&:has(>[data-orientation=vertical])_[data-sidebar=content]]:pr-0",
    );
  });
});

describe("the sidebar rail", () => {
  const rail = classOf(html, 'data-sidebar="rail"');

  it("sits outside the panel instead of straddling its edge", () => {
    expect(rail).not.toContain("-translate-x-1/2");
    expect(rail).toContain("group-data-[side=left]:-right-2.5");
    expect(rail).toContain("w-2.5");
  });
});

describe("the protected layouts", () => {
  for (const layout of [
    "protected-default-layout",
    "protected-driver-layout",
  ]) {
    it(`${layout} scrolls its menu through SidebarScrollArea`, () => {
      const source = read(
        `app/(protected)/_components/layout/${layout}/index.tsx`,
      );

      expect(source).toContain("<SidebarScrollArea");
      expect(source).not.toMatch(/<ScrollArea\b/);
    });
  }
});
