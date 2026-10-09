import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { afterEach, describe, expect, it, vi } from "vitest";

import { React, renderHtml } from "./helpers/render-html";

import { SiteFooter as Footer } from "@/components/site/site-footer";
import { CopyrightYear } from "@/components/site/site-footer/copyright-year";

/**
 * The © year of the public footer.
 *
 * The public pages are prerendered, and the footer computed the year while
 * rendering: the build's year, frozen until the next deploy, so every page
 * said "© 2026" all through January 2027. The server's year is now only the
 * first paint; the browser's replaces it once the page is live.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the footer year", () => {
  it("the footer shows the year through the component that updates in the browser", () => {
    const html = renderHtml(React.createElement(Footer));

    expect(html).toMatch(/©\s*<span data-copyright-year="">\d{4}<\/span>/);
  });

  it("a page generated in 2026 shows 2027 when opened in 2027, with no hydration error", async () => {
    const built = renderToString(
      React.createElement(CopyrightYear, { initialYear: 2026 }),
    );

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2027, 0, 2, 9, 0));

    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const host = document.createElement("div");
    host.innerHTML = built;
    document.body.appendChild(host);

    await act(async () => {
      root = hydrateRoot(
        host,
        React.createElement(CopyrightYear, { initialYear: 2026 }),
      );
    });

    expect(host.textContent).toBe("2027");
    expect(errors).not.toHaveBeenCalled();
  });
});
