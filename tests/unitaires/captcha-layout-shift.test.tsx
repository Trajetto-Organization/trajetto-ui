// @vitest-environment node
import { describe, expect, it } from "vitest";

import { React, renderHtml } from "./helpers/render-html";

import { CaptchaTurnstile } from "@/components/shared/custom/captcha-turnstile";

void React;

/**
 * The captcha mounts half a second after the page (and only once the site key
 * is known), and nothing held its place: the widget pushed everything under
 * it down, a layout shift of 0.10 on /login measured against the production
 * build (docs/arquitetura.md, "Desempenho"). The server markup now reserves the
 * widget's height, so the iframe lands in space that is already there.
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
        <CaptchaTurnstile onSuccess={() => undefined} size={size} />,
      );

      expect(html).toContain(`min-height:${height}px`);
    },
  );

  it("keeps the caller's spacing on the reserved box", () => {
    const html = renderHtml(
      <CaptchaTurnstile onSuccess={() => undefined} className="mx-auto" />,
    );

    expect(html).toMatch(/class="[^"]*mt-5[^"]*mx-auto/);
  });
});
