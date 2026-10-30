import { describe, expect, it, vi } from "vitest";

import { React, renderHtml } from "./helpers/render-html";

const pathname = vi.hoisted(() => ({ current: "/login" }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

import { NavigateButton } from "@/components/layouts/auth-layout/navigate-button";

/**
 * The corner link of the sign-in pages read "Voltar ao início" on screen and
 * "Voltar para home" to assistive technology (an aria-label), so a voice
 * command saying what is on screen did not find it: Lighthouse's
 * label-content-name-mismatch, WCAG 2.5.3. It is now named by its own text.
 */
describe("the sign-in pages' corner link", () => {
  it.each([
    ["/login", "/", "Voltar ao início"],
    ["/forgot", "/login", "Entrar"],
  ])("on %s goes to %s, named by what it shows", (path, href, text) => {
    pathname.current = path;
    const host = document.createElement("div");
    host.innerHTML = renderHtml(React.createElement(NavigateButton));
    const link = host.querySelector("a")!;

    expect(link.getAttribute("href")).toBe(href);
    expect(link.hasAttribute("aria-label")).toBe(false);
    expect(link.textContent?.trim()).toBe(text);
    for (const icon of Array.from(link.querySelectorAll("svg"))) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
