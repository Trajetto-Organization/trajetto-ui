import { renderHtml, React } from "./helpers/render-html";

import { describe, expect, it } from "vitest";

import { PageToolbarProvider } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { RefreshButton } from "@/components/shared/custom/refresh-button";

/**
 * "Atualizar" for the client-fetched panels, sized like every other page
 * action when the caller does not choose: h-9 on /admin and /dashboard alike
 * (decision 16.61, which reverses 3.6's h-10 beside the selector), full width
 * so a phone stacks it with its label.
 */
function buttonClasses(element: React.ReactElement): string[] {
  const html = renderHtml(element);
  const match = /<button[^>]*class="([^"]*)"/.exec(html);

  expect(match, "the button").not.toBeNull();

  return match![1].split(/\s+/);
}

const button = () =>
  React.createElement(RefreshButton, {
    storageKey: "test-refresh",
    onRefresh: () => {},
  });

describe("the Atualizar button without a caller class", () => {
  it("outside the page toolbar: h-9 and full width", () => {
    expect(buttonClasses(button())).toEqual(
      expect.arrayContaining(["h-9", "w-full"]),
    );
  });

  it("on the company selector's line: h-9 too, not the selector's h-10", () => {
    const classes = buttonClasses(
      React.createElement(PageToolbarProvider, {
        hasContext: true,
        children: button(),
      }),
    );

    expect(classes).toEqual(expect.arrayContaining(["h-9", "w-full"]));
    expect(classes).not.toContain("h-10");
    expect(classes).not.toContain("h-8");
  });

  it("keeps honouring the caller's class", () => {
    const classes = buttonClasses(
      React.createElement(RefreshButton, {
        storageKey: "test-refresh",
        onRefresh: () => {},
        className: "h-7 w-auto",
      }),
    );

    expect(classes).toEqual(expect.arrayContaining(["h-7", "w-auto"]));
    expect(classes).not.toContain("w-full");
  });
});
