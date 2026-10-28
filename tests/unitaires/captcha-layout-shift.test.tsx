// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { React, renderHtml } from "./helpers/render-html";

import { CaptchaTurnstile } from "@/components/shared/custom/captcha-turnstile";
import { CaptchaSkeleton } from "@/components/shared/custom/captcha-turnstile/captcha-skeleton";

void React;

/**
 * The captcha mounts half a second after the page (and only once the site key
 * is known), and nothing held its place: the widget pushed everything under
 * it down, a layout shift of 0.10 on /login measured against the production
 * build (docs/arquitetura.md, "Desempenho"). The server markup now reserves the
 * widget's height, so the iframe lands in space that is already there.
 *
 * The reserved box used to be empty until the iframe painted (README §10):
 * it now carries a skeleton of the widget's size from the server markup on,
 * announced as loading, never as a passed check.
 */
describe("CaptchaTurnstile", () => {
  it.each([
    ["normal", 65],
    ["flexible", 65],
    ["compact", 140],
  ] as const)(
    "reserves the %s widget's height before it mounts",
    (size, height) => {
      const html = renderHtml(
        <CaptchaTurnstile onTokenChange={() => undefined} size={size} />,
      );

      expect(html).toContain(`min-height:${height}px`);
    },
  );

  it.each([
    ["normal", 65, "w-[300px]"],
    ["flexible", 65, "w-full"],
    ["compact", 140, "w-[150px]"],
  ] as const)(
    "draws a %s skeleton of the widget's size, hidden from screen readers",
    (size, height, width) => {
      const html = renderHtml(
        <CaptchaTurnstile onTokenChange={() => undefined} size={size} />,
      );

      expect(html).toMatch(
        new RegExp(
          `aria-hidden="true" data-captcha-skeleton=""[^>]*class="[^"]*${width.replace(/[[\]]/g, "\\$&")}[^"]*"[^>]*style="height:${height}px"`,
        ),
      );
    },
  );

  it("is announced as loading from the server markup on, never as passed", () => {
    const html = renderHtml(
      <CaptchaTurnstile onTokenChange={() => undefined} size="flexible" />,
    );

    expect(html).toContain('data-captcha-state="loading"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toMatch(
      /role="status" class="sr-only">Carregando verificação de segurança…</,
    );
    expect(html).not.toContain("Verificação de segurança concluída");
    expect(html).not.toContain('role="alert"');
  });

  it("keeps the caller's spacing on the reserved box", () => {
    const html = renderHtml(
      <CaptchaTurnstile onTokenChange={() => undefined} className="mx-auto" />,
    );

    expect(html).toMatch(/class="[^"]*mt-5[^"]*mx-auto/);
  });

  it("exposes the status under the id the form's submit points at", () => {
    const html = renderHtml(
      <CaptchaTurnstile onTokenChange={() => undefined} statusId="cap-x" />,
    );

    expect(html).toMatch(/<div id="cap-x"><p role="status"/);
  });
});

describe("the (auth) loading fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function fallbackHtml(): Promise<string> {
    const { default: Loading } = await import("@/app/(auth)/loading");

    return renderHtml(<Loading />);
  }

  it("reserves the captcha's box where the production forms draw it", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const html = await fallbackHtml();
    const skeleton = renderHtml(<CaptchaSkeleton size="flexible" />);

    expect(html).toContain(skeleton);
    expect(html).toContain("height:65px");
  });

  it("has no captcha box where the forms have none (development)", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const html = await fallbackHtml();

    expect(html).not.toContain("data-captcha-skeleton");
  });
});
