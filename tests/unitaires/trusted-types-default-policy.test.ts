import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT,
  TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT_HASH,
} from "@/lib/trusted-types-default-policy";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init-script";

import { React, renderHtml } from "./helpers/render-html";

/**
 * The Trusted Types "default" policy, for a sink in code we cannot change.
 *
 * Trusted Types run Report-Only on every page. react-turnstile 1.1.4 injects
 * the captcha's api.js with `script.src = "<url>"`, a raw string, so every
 * visit to /login reported a TrustedScriptURL violation (DevTools Issues,
 * Lighthouse's "inspector-issues"). The root layout now creates the default
 * policy before hydration. These tests keep it narrow (exactly Turnstile's
 * api.js; everything else gets null and still reports), keep its hash in step
 * with its text, and keep it in the layout.
 */
type CreatePolicy = (
  name: string,
  rules: Record<string, unknown>,
) => Record<string, unknown>;

type ScriptUrlRules = { createScriptURL: (input: string) => unknown };

const TURNSTILE_API = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function run(trustedTypes: unknown) {
  vi.stubGlobal("trustedTypes", trustedTypes);

  // The exact text the browser runs, as the hash covers it.
  new Function(TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT)();
}

/** Runs the script in a browser with Trusted Types and no default policy yet. */
function createdPolicy() {
  const createPolicy = vi.fn<
    Parameters<CreatePolicy>,
    ReturnType<CreatePolicy>
  >((name, rules) => ({ name, ...rules }));

  run({ defaultPolicy: null, createPolicy });

  expect(createPolicy).toHaveBeenCalledTimes(1);

  const [name, rules] = createPolicy.mock.calls[0];

  return { name, rules };
}

function scriptUrl(input: string): unknown {
  return (createdPolicy().rules as ScriptUrlRules).createScriptURL(input);
}

/** The URL react-turnstile sets, read from the installed library. */
function libraryScriptUrl(): string {
  const source = readFileSync(
    createRequire(import.meta.url).resolve("react-turnstile"),
    "utf8",
  );

  const src = /TURNSTILE_SRC = "([^"]+)"/.exec(source)?.[1];
  const onload = /TURNSTILE_LOAD_FUNCTION = "([^"]+)"/.exec(source)?.[1];

  expect(src, "TURNSTILE_SRC em react-turnstile").toBeDefined();
  expect(onload, "TURNSTILE_LOAD_FUNCTION em react-turnstile").toBeDefined();
  expect(source).toContain(
    "`${TURNSTILE_SRC}?onload=${TURNSTILE_LOAD_FUNCTION}&render=explicit`",
  );
  expect(source).toContain("script.src = url;");

  return `${src}?onload=${onload}&render=explicit`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT_HASH", () => {
  it("is the SHA-256 of the exact script text", () => {
    const digest = createHash("sha256")
      .update(TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT, "utf8")
      .digest("base64");

    expect(TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT_HASH).toBe(`'sha256-${digest}'`);
  });
});

describe("the default policy", () => {
  it("takes the name the CSP reserves and handles script URLs only, no HTML or script text", () => {
    const { name, rules } = createdPolicy();

    expect(name).toBe("default");
    expect(Object.keys(rules)).toEqual(["createScriptURL"]);
  });

  it("lets through the exact URL react-turnstile sets", () => {
    const url = libraryScriptUrl();

    expect(url).toBe(
      `${TURNSTILE_API}?onload=cf__reactTurnstileOnLoad&render=explicit`,
    );
    expect(scriptUrl(url)).toBe(url);
  });

  it("lets the same parameters through in either order", () => {
    const url = `${TURNSTILE_API}?render=explicit&onload=cf__reactTurnstileOnLoad`;

    expect(scriptUrl(url)).toBe(url);
  });

  it.each([
    // api.js calls the global its `onload` names once it loads, so the policy
    // takes no other query than the library's own.
    TURNSTILE_API,
    `${TURNSTILE_API}?onload=alert&render=explicit`,
    `${TURNSTILE_API}?onload=cf__reactTurnstileOnLoad`,
    `${TURNSTILE_API}?onload=cf__reactTurnstileOnLoad&render=auto`,
    `${TURNSTILE_API}?onload=cf__reactTurnstileOnLoad&render=explicit&compat=recaptcha`,
    `${TURNSTILE_API}?onload=cf__reactTurnstileOnLoad&onload=alert&render=explicit`,
    `${TURNSTILE_API}?onload=cf__reactTurnstileOnLoad&render=explicit#x`,
  ])("refuses api.js with any other query: %s", (url) => {
    expect(scriptUrl(url)).toBeNull();
  });

  it.each([
    // Other origins, lookalikes included.
    "https://evil.example/turnstile/v0/api.js",
    "https://cloudflare.com/turnstile/v0/api.js",
    "https://static.cloudflareinsights.com/beacon.min.js",
    "https://challenges.cloudflare.com.evil.com/turnstile/v0/api.js",
    "https://challenges.cloudflare.com\t.evil.com/turnstile/v0/api.js",
    "https://challenges.cloudflare.com@evil.example/turnstile/v0/api.js",
    "https:\\\\evil.example/turnstile/v0/api.js",
    `https://evil.example/?${TURNSTILE_API}`,
    `https://evil.example/#${TURNSTILE_API}`,
    // Other paths on Turnstile's own host.
    "https://challenges.cloudflare.com/turnstile/v0/api.jsx",
    "https://challenges.cloudflare.com/turnstile/v1/api.js",
    "https://challenges.cloudflare.com/turnstile/v0/api.js/evil.js",
    "https://challenges.cloudflare.com/turnstile/v0/../../evil.js",
    "https://challenges.cloudflare.com/evil.js?/turnstile/v0/api.js",
    "https://challenges.cloudflare.com/",
    // Other schemes.
    "http://challenges.cloudflare.com/turnstile/v0/api.js",
    `javascript:alert(1)//${TURNSTILE_API}`,
    "data:text/javascript,alert(1)",
    `blob:${TURNSTILE_API}`,
    // Protocol-relative and relative: nothing to check an origin against.
    "//evil.example/turnstile/v0/api.js",
    "//challenges.cloudflare.com.evil.com/turnstile/v0/api.js",
    "/turnstile/v0/api.js",
    "",
  ])("refuses %s, so the browser still reports it", (url) => {
    expect(scriptUrl(url)).toBeNull();
  });

  it("does nothing in a browser without Trusted Types", () => {
    expect(() => run(undefined)).not.toThrow();
  });

  it("leaves a default policy that already exists alone", () => {
    const createPolicy = vi.fn();

    run({ defaultPolicy: { name: "default" }, createPolicy });

    expect(createPolicy).not.toHaveBeenCalled();
  });

  it("never breaks the page when the browser refuses the policy", () => {
    const createPolicy = vi.fn(() => {
      throw new TypeError('Policy with name "default" disallowed.');
    });

    expect(() => run({ defaultPolicy: null, createPolicy })).not.toThrow();
    expect(createPolicy).toHaveBeenCalledTimes(1);
  });
});

describe("where it runs", () => {
  // The first import of the root layout compiles most of the app.
  beforeAll(async () => {
    await import("@/app/layout");
  }, 60_000);

  it("is rendered by the root layout, byte for byte, early in <body>, before the page", async () => {
    const { default: RootLayout } = await import("@/app/layout");

    const html = renderHtml(
      React.createElement(RootLayout, null, React.createElement("main", null)),
    );

    const policy = html.indexOf(
      `<script>${TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT}</script>`,
    );
    const theme = html.indexOf(`<script>${THEME_INIT_SCRIPT}</script>`);

    expect(policy, "o script da política no HTML do layout").toBeGreaterThan(
      html.indexOf("<body"),
    );
    // Next to the theme script, ahead of the content that will hydrate.
    expect(theme).toBeGreaterThan(-1);
    expect(policy).toBeLessThan(html.indexOf("<main"));
  });
});
