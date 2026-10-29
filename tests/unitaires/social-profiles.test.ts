// @vitest-environment node
import { describe, expect, it } from "vitest";

import { React, renderHtml } from "./helpers/render-html";

import { homeJsonLd } from "@/components/site/home/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { buildPageMetadata } from "@/lib/page-metadata";
import { siteConfig } from "@/lib/site";

/**
 * The brand's social profiles, as search engines read them.
 *
 * The footer linked LinkedIn, Instagram and X, but the Organization node of
 * the home page's JSON-LD had no `sameAs`, and the cards named no @handle:
 * a crawler saw three outbound links like any other, nothing saying those
 * accounts are this company's. One list now feeds the footer, `sameAs` and
 * the X card, so they cannot drift apart.
 */
function organization(): Record<string, unknown> {
  const graph = homeJsonLd()["@graph"] as Array<Record<string, unknown>>;
  const node = graph.find((item) => item["@type"] === "Organization");

  expect(node, "Organization node").toBeDefined();

  return node!;
}

describe("the brand's social profiles", () => {
  const profiles = siteConfig.socialProfiles.map((profile) => profile.href);

  it("are https URLs, one per network", () => {
    expect(profiles.length).toBeGreaterThan(0);
    for (const href of profiles) expect(href).toMatch(/^https:\/\//);
    expect(new Set(profiles).size).toBe(profiles.length);
  });

  it("are the Organization's sameAs on the home page", () => {
    expect(organization().sameAs).toEqual(profiles);
  });

  it("are the links the footer shows", () => {
    const html = renderHtml(React.createElement(SiteFooter));
    const links = [...html.matchAll(/href="(https:\/\/[^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(links).toEqual(expect.arrayContaining(profiles));
  });

  it("name the X account on the page cards", () => {
    const x = siteConfig.socialProfiles.find(
      (profile) => profile.network === "x",
    );
    const metadata = buildPageMetadata({
      path: "/blog",
      title: "Blog",
      description: "Artigos",
    });

    expect(x?.handle).toMatch(/^@\w+$/);
    expect(metadata.twitter).toMatchObject({
      site: x?.handle,
      creator: x?.handle,
    });
  });
});
