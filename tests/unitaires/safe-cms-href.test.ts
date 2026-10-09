// @vitest-environment node
import { createElement } from "react";

import { describe, expect, it } from "vitest";

import { renderHtml } from "./helpers/render-html";

import { MdxLink } from "@/components/mdx/mdx-link";
import { safeCmsHref } from "@/lib/safe-cms-href";

/**
 * Links written in the site's content, rendered on the product's own origin.
 *
 * The blog and legal pages are served by this same Next app, next to
 * /dashboard and /admin. React 18 only warns about `javascript:`; it still
 * renders it. A link like that in a post would run script as whoever clicks
 * it, including a logged-in MASTER, with the session's server actions at
 * hand. The content is MDX in the repository now, reviewed like code, and
 * the check stays because it costs nothing.
 */
describe("safeCmsHref", () => {
  it.each([
    "javascript:alert(1)",
    " JavaScript:alert(1)",
    "\u0001javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.example/path",
    "/\\evil.example",
    "/\t/evil.example",
    "",
  ])("turns %j into a dead link", (href) => {
    expect(safeCmsHref(href)).toBe("#");
  });

  it.each([undefined, null, 42, { href: "https://x" }])(
    "turns a non-string (%j) into a dead link",
    (href) => {
      expect(safeCmsHref(href)).toBe("#");
    },
  );

  it.each([
    "https://intrajetto.com/blog",
    "http://example.com",
    "/blog/frota-e-custos",
    "#secao",
    "mailto:contato@intrajetto.com",
    "tel:+5511999999999",
  ])("keeps %j as written", (href) => {
    expect(safeCmsHref(href)).toBe(href);
  });
});

describe("the MDX link", () => {
  // Rendered for real: a regex over the source would pass on a component
  // that imports the helper and never calls it.
  it.each([
    ["javascript:alert(1)", 'href="#"'],
    ["//evil.example/path", 'href="#"'],
    ["https://intrajetto.com/blog", 'href="https://intrajetto.com/blog"'],
    ["/orcamento", 'href="/orcamento"'],
    ["#secao", 'href="#secao"'],
  ])("renders %j as %s", (href, expected) => {
    const html = renderHtml(createElement(MdxLink, { href }, "texto"));

    expect(html).toContain(expected);
  });

  it("opens external links in a new tab without handing over the opener", () => {
    const html = renderHtml(
      createElement(MdxLink, { href: "https://www.planalto.gov.br" }, "lei"),
    );

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
