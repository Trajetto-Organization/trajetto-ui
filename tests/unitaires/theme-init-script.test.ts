import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  THEME_INIT_SCRIPT,
  THEME_INIT_SCRIPT_HASH,
} from "@/lib/theme-init-script";
import { ThemeProvider } from "@/providers/theme-provider";

// The components compile with the classic JSX runtime under Vitest.
(globalThis as { React?: typeof React }).React = React;

/**
 * The theme script under the enforced CSP.
 *
 * The strict policy allows inline script by nonce or by hash only. The root
 * layout is prerendered for the public pages, so it carries no nonce, and
 * next-themes' own script text comes from Function.toString() of minified
 * code. That script was blocked on every per-request page (a light flash for
 * dark-theme users and a CSP report per page view). The replacement is a
 * constant whose hash the policy lists; these tests keep the two in step.
 */
function setColorScheme(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: prefersDark && query === "(prefers-color-scheme: dark)",
    })),
  );
}

function run() {
  // The exact text the browser runs, as the hash covers it.
  new Function(THEME_INIT_SCRIPT)();
}

beforeEach(() => {
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("THEME_INIT_SCRIPT_HASH", () => {
  it("is the SHA-256 of the exact script text", () => {
    const digest = createHash("sha256")
      .update(THEME_INIT_SCRIPT, "utf8")
      .digest("base64");

    expect(THEME_INIT_SCRIPT_HASH).toBe(`'sha256-${digest}'`);
  });
});

describe("THEME_INIT_SCRIPT", () => {
  it("applies a saved dark theme before paint", () => {
    setColorScheme(false);
    localStorage.setItem("theme", "dark");

    run();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("follows the system when nothing is saved", () => {
    setColorScheme(true);

    run();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("replaces the other theme's class", () => {
    setColorScheme(true);
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "light");

    run();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("ignores a stored value that is no theme, markup included", () => {
    setColorScheme(false);
    localStorage.setItem("theme", '"><img src=x onerror=alert(1)>');

    run();

    expect(document.documentElement.className).toBe("");
  });
});

describe("where it runs", () => {
  it("is the only theme script the root layout renders", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );

    expect(layout).toContain("__html: THEME_INIT_SCRIPT");
  });

  it("keeps next-themes' own script inert, so the policy has nothing to block", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeProvider, {
        attribute: "class",
        defaultTheme: "system",
        enableSystem: true,
        children: createElement("p", null, "conteúdo"),
      }),
    );

    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);

    expect(scripts.length).toBeGreaterThan(0);

    for (const attributes of scripts) {
      expect(attributes).toContain('type="application/json"');
    }
  });
});
