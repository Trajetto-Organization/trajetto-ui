import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ThemeProvider as NextThemesProvider } from "next-themes";
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
import { React, renderHtml } from "./helpers/render-html";

import { ProtectedHeaderThemeToggle } from "@/app/(protected)/_components/layout/protected-theme-switch";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  THEME_TRANSITION_ATTRIBUTE,
  THEME_TRANSITION_MS,
  resolveTheme,
  switchTheme,
  toggleTarget,
} from "@/components/shared/theme-toggle/switch-theme";

void React;

/**
 * The theme switch in the app, the auth pages, the public site and the docs:
 * where it sits, and how a switch is shown (one view transition, or an
 * instant change where that is not possible).
 */

const SRC = resolve(__dirname, "../../src");
const read = (path: string) => readFileSync(resolve(SRC, path), "utf8");

type UpdateCallback = () => void;

/** A document.startViewTransition double that runs the update when told to. */
function stubViewTransition() {
  const pending: UpdateCallback[] = [];
  let finish: () => void = () => undefined;
  const finished = new Promise<void>((done) => {
    finish = done;
  });
  const skipTransition = vi.fn();
  const start = vi.fn((update: UpdateCallback) => {
    pending.push(update);
    return { finished, skipTransition };
  });

  (
    document as unknown as { startViewTransition?: unknown }
  ).startViewTransition = start;

  return {
    start,
    skipTransition,
    runUpdate: () => pending.shift()?.(),
    finish: async () => {
      finish();
      await finished;
      await Promise.resolve();
    },
  };
}

function stubMedia({ reduce = false, dark = false } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches:
      (reduce && query.includes("reduce")) ||
      (dark && query.includes("prefers-color-scheme: dark")),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
}

const switchStyle = () => document.querySelector("style[data-theme-switch]");

beforeEach(() => {
  switchStyle()?.remove();
  document.documentElement.className = "light";
  document.documentElement.removeAttribute(THEME_TRANSITION_ATTRIBUTE);
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  delete (document as unknown as { startViewTransition?: unknown })
    .startViewTransition;
  vi.unstubAllGlobals();
});

describe("where the theme switch sits", () => {
  it("sits in the header between the search and the bell in both app layouts", () => {
    for (const layout of [
      "app/(protected)/_components/layout/protected-default-layout/index.tsx",
      "app/(protected)/_components/layout/protected-driver-layout/index.tsx",
    ]) {
      const source = read(layout);

      expect(source).toMatch(
        /<SearchInput \/>\s*<ProtectedHeaderThemeToggle \/>\s*<ProtectedNotificationsMenu/,
      );
      // And the phone control in the sidebar footer, above the account.
      expect(source).toMatch(
        /<ProtectedSidebarThemeSwitch \/>\s*<SidebarMenu>\s*<SidebarMenuItem>\s*<ProtectedAccountSettings/,
      );
    }
  });

  it("hides the header button on phones and gives it the bell's size", () => {
    const html = renderHtml(<ProtectedHeaderThemeToggle />);

    expect(html).toContain("hidden md:contents");
    expect(html).toMatch(/class="[^"]*size-9[^"]*rounded-lg[^"]*border/);
    // Before hydration the label cannot name the target theme.
    expect(html).toContain('aria-label="Alternar tema"');
  });

  it("is in the account menu, the profile and the auth pages", () => {
    expect(
      read(
        "app/(protected)/_components/layout/protected-account-settings/index.tsx",
      ),
    ).toContain("<ProtectedAccountThemeMenu disabled={isLoggingOut} />");
    expect(read("app/(protected)/profile/profile-content.tsx")).toContain(
      "<UserAppearance />",
    );
    expect(read("components/layouts/auth-layout/index.tsx")).toMatch(
      /<ThemeToggle tone="app"/,
    );
  });
});

describe("switchTheme", () => {
  it("flips the theme inside a view transition, after the old snapshot", async () => {
    stubMedia();
    const vt = stubViewTransition();
    const setTheme = vi.fn();
    const root = document.documentElement;

    expect(switchTheme(setTheme, "dark")).toBe("view-transition");

    // Nothing changes until the browser has the old picture.
    expect(vt.start).toHaveBeenCalledTimes(1);
    expect(setTheme).not.toHaveBeenCalled();
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.hasAttribute(THEME_TRANSITION_ATTRIBUTE)).toBe(true);

    vt.runUpdate();

    // The class is on <html> before the new snapshot, whatever React's
    // effect timing: next-themes applies it from an effect.
    expect(setTheme).toHaveBeenCalledWith("dark");
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.classList.contains("light")).toBe(false);
    expect(root.style.colorScheme).toBe("dark");

    await vt.finish();
    expect(root.hasAttribute(THEME_TRANSITION_ATTRIBUTE)).toBe(false);
  });

  it("changes at once where the View Transitions API is missing", () => {
    stubMedia();
    const setTheme = vi.fn();

    expect(switchTheme(setTheme, "dark")).toBe("instant");
    expect(setTheme).toHaveBeenCalledWith("dark");
    expect(
      document.documentElement.hasAttribute(THEME_TRANSITION_ATTRIBUTE),
    ).toBe(false);
  });

  it("changes at once under reduced motion, even with the API", () => {
    stubMedia({ reduce: true });
    const vt = stubViewTransition();
    const setTheme = vi.fn();

    expect(switchTheme(setTheme, "dark")).toBe("instant");
    expect(vt.start).not.toHaveBeenCalled();
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("skips the fade when the choice does not change the screen", () => {
    // "Sistema" while the system is light and the page already light.
    stubMedia({ dark: false });
    const vt = stubViewTransition();
    const setTheme = vi.fn();

    expect(switchTheme(setTheme, "system")).toBe("instant");
    expect(vt.start).not.toHaveBeenCalled();
    expect(setTheme).toHaveBeenCalledWith("system");
  });

  it("resolves the system choice through prefers-color-scheme", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("keeps the marker until the latest of two quick switches ends", async () => {
    stubMedia();
    const first = stubViewTransition();
    const setTheme = vi.fn();

    switchTheme(setTheme, "dark");
    first.runUpdate();

    const second = stubViewTransition();

    switchTheme(setTheme, "light");
    await first.finish();
    expect(
      document.documentElement.hasAttribute(THEME_TRANSITION_ATTRIBUTE),
    ).toBe(true);

    second.runUpdate();
    await second.finish();
    expect(
      document.documentElement.hasAttribute(THEME_TRANSITION_ATTRIBUTE),
    ).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});

describe("switchTheme: input and color transitions", () => {
  it("hands a press made during the fade to the element under it", async () => {
    // Chromium hit-tests the captured root as <html> for the whole fade, so
    // without this a second toggle click or a link click was dropped.
    stubMedia();
    const vt = stubViewTransition();
    const button = document.createElement("button");
    const seen: string[] = [];

    document.body.appendChild(button);
    for (const type of ["pointerdown", "mousedown", "click"]) {
      button.addEventListener(type, () => seen.push(type));
    }

    const fromPoint = vi
      .spyOn(document, "elementFromPoint")
      .mockReturnValue(button);

    try {
      switchTheme(vi.fn(), "dark");
      vt.runUpdate();

      const root = document.documentElement;

      root.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 10,
        }),
      );
      expect(vt.skipTransition).toHaveBeenCalledTimes(1);
      expect(seen).toEqual(["pointerdown", "mousedown"]);
      expect(document.activeElement).toBe(button);

      // The release lands on the button, so the browser clicks <html>.
      root.dispatchEvent(
        new MouseEvent("click", { bubbles: true, clientX: 10, clientY: 10 }),
      );
      expect(seen).toEqual(["pointerdown", "mousedown", "click"]);

      // Once the fade is over, presses are left alone.
      await vt.finish();
      seen.length = 0;
      root.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(seen).toEqual([]);
    } finally {
      fromPoint.mockRestore();
      button.remove();
    }
  });

  it("toggles from the switch still in flight, not from the stale class", () => {
    stubMedia();
    const vt = stubViewTransition();
    const setTheme = vi.fn();

    expect(toggleTarget()).toBe("dark");
    switchTheme(setTheme, toggleTarget());

    // Second click before the browser ran the first update.
    expect(toggleTarget()).toBe("light");
    switchTheme(setTheme, toggleTarget());

    vt.runUpdate();
    vt.runUpdate();
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(setTheme).toHaveBeenLastCalledWith("light");
  });

  it("applies the latest choice when a second one comes before the update", () => {
    stubMedia();
    const vt = stubViewTransition();
    const setTheme = vi.fn();

    switchTheme(setTheme, "dark");
    switchTheme(setTheme, "light");

    vt.runUpdate();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(setTheme).toHaveBeenLastCalledWith("light");
  });

  it("holds color transitions off during the flip, keeping motion ones", async () => {
    stubMedia();
    const vt = stubViewTransition();
    let ruleDuringFlip = "";
    const setTheme = vi.fn(() => {
      ruleDuringFlip = switchStyle()?.textContent ?? "";
    });

    switchTheme(setTheme, "dark");
    vt.runUpdate();

    const allowed =
      /transition-property:([^!]+)!important/
        .exec(ruleDuringFlip)?.[1]
        .split(",") ?? [];

    expect(allowed).toEqual(
      expect.arrayContaining(["transform", "opacity", "grid-template-rows"]),
    );
    expect(
      allowed.filter((property) =>
        /color|background|border|shadow|fill|stroke$/.test(property),
      ),
    ).toEqual([]);

    // Kept for the fade (removing it restyles the whole tree), gone after.
    expect(switchStyle()).not.toBeNull();
    await vt.finish();
    expect(switchStyle()).toBeNull();
  });

  it("flips at once on the instant path, then drops the rule after a frame", async () => {
    stubMedia({ reduce: true });
    const setTheme = vi.fn();

    expect(switchTheme(setTheme, "dark")).toBe("instant");
    // Applied in the click itself, not in next-themes' later effect.
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(switchStyle()).not.toBeNull();

    await new Promise((done) => setTimeout(done, 50));
    expect(switchStyle()).toBeNull();
  });
});

describe("ThemeToggle with next-themes", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    localStorage.setItem("theme", "light");
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    localStorage.clear();
  });

  it("switches the real provider through the view transition", async () => {
    stubMedia();
    const vt = stubViewTransition();

    await act(async () => {
      root.render(
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          storageKey="theme"
        >
          <ThemeToggle tone="app" />
        </NextThemesProvider>,
      );
    });

    const button = host.querySelector("button")!;

    expect(button.getAttribute("aria-label")).toBe("Alternar para tema escuro");

    await act(async () => button.click());
    expect(vt.start).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("theme")).toBe("light");

    // The update renders the provider synchronously (flushSync), so the
    // new snapshot already has the new label and the stored choice.
    act(() => vt.runUpdate());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(button.getAttribute("aria-label")).toBe("Alternar para tema claro");
  });

  it("ends where it started after two clicks faster than the snapshot", async () => {
    stubMedia();
    const vt = stubViewTransition();

    await act(async () => {
      root.render(
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          storageKey="theme"
        >
          <ThemeToggle tone="app" />
        </NextThemesProvider>,
      );
    });

    const button = host.querySelector("button")!;

    await act(async () => button.click());
    await act(async () => button.click());
    expect(vt.start).toHaveBeenCalledTimes(2);

    act(() => {
      vt.runUpdate();
      vt.runUpdate();
    });
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});

describe("theme switch styles", () => {
  const css = read("app/globals.css");

  it("has no per-element color fade left, in the app or on the site", () => {
    // ~3,700 simultaneous transitions on the dashboard, and the rule that
    // cut the auth page's card stack mid-slide.
    expect(css).not.toContain("theme-switching");
    expect(
      existsSync(resolve(SRC, "components/layouts/theme-switch-fade")),
    ).toBe(false);

    const siteRoot = css.slice(
      css.indexOf(".site-root {"),
      css.indexOf("}", css.indexOf(".site-root {")),
    );

    expect(siteRoot).not.toMatch(/transition/);

    const html = css.slice(
      css.indexOf("\nhtml {"),
      css.indexOf("}", css.indexOf("\nhtml {")),
    );

    expect(html).not.toMatch(/transition/);
    expect(css).not.toMatch(/body \{\s*@apply[^}]*\btransition\b/);
  });

  it("cross-fades the root snapshot for exactly the time the helper waits for", () => {
    const block = css.slice(
      css.indexOf("html[data-theme-transition]::view-transition-old(root),"),
    );

    expect(block).toContain(`animation-duration: ${THEME_TRANSITION_MS}ms;`);
    expect(css).toMatch(
      /html\[data-theme-transition\]::view-transition-new\(root\) \{\s*animation: none;/,
    );
    // Only the root is captured: a named element would fade on its own.
    expect(
      [...css.matchAll(/view-transition-name:\s*([\w-]+)/g)].map(
        (match) => match[1],
      ),
    ).toEqual([]);
  });

  it("routes every theme control through the transition", () => {
    // Only the shared hook may talk to next-themes' setter directly.
    for (const path of [
      "app/(protected)/_components/layout/protected-theme-switch/index.tsx",
      "components/site/site-header/index.tsx",
      "app/docs/_components/docs-header.tsx",
      "components/layouts/auth-layout/index.tsx",
    ]) {
      expect(read(path), path).not.toMatch(/from "next-themes"/);
    }

    expect(read("components/shared/theme-toggle/index.tsx")).toMatch(
      /switchTheme\(setTheme, choice\)/,
    );
  });
});

describe("dark map styles", () => {
  // The maps' own stylesheet, imported by each map (app-only-stylesheets.test.ts).
  const css = read("features/control-tower/lib/leaflet-theme.css");

  it("recolors only the tile pane, keeping hues, and not over a native dark style", () => {
    const rule =
      /\.dark \.leaflet-container:not\(\.map-tiles-native-dark\) \.leaflet-tile-pane \{\s*filter: ([^;]+);/.exec(
        css,
      );

    expect(rule).not.toBeNull();

    const filter = rule![1];

    expect(filter).toMatch(/^invert\(1\) hue-rotate\(1[89]\ddeg\)/);
    // The old saturate(.6) grayed parks and water out.
    const saturation = Number(/saturate\(([\d.]+)\)/.exec(filter)?.[1] ?? "1");

    expect(saturation).toBeGreaterThanOrEqual(1);
    // Markers and trails live in other panes and keep their colors.
    expect(css).not.toMatch(
      /\.dark \.leaflet-(marker|overlay)-pane \{[^}]*filter/,
    );
  });
});
