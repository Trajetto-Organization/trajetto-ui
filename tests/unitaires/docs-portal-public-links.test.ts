// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import sitemap from "@/app/sitemap";
import { API_DOCS_PATH } from "@/app/docs/_lib/navigation";
import { FOOTER_SECTIONS, PUBLIC_PAGES } from "@/lib/public-pages";

/**
 * The developer portal is public (decision 11.1), but nothing on the public
 * site pointed at it: only the product's sidebar did, so an integrator
 * without an account — the person evaluating the API — could not find it.
 * It goes through the one registry of public pages, which feeds the footer
 * and the sitemap together.
 */
const ORIGIN = "https://www.intrajetto.com";

beforeEach(() => {
  vi.stubEnv("METADATA_BASE", ORIGIN);
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the developer portal on the public site", () => {
  it("is a registered public page", () => {
    const page = PUBLIC_PAGES.find((item) => item.path === API_DOCS_PATH);

    expect(page, "o portal não está em PUBLIC_PAGES").toBeDefined();
    expect(page!.label).toBe("Documentação da API");
  });

  it("is linked from the footer", () => {
    const links = FOOTER_SECTIONS.flatMap((section) => section.links);

    expect(links).toContainEqual(
      expect.objectContaining({
        href: API_DOCS_PATH,
        label: "Documentação da API",
      }),
    );
  });

  it("is in the sitemap exactly once", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(
      urls.filter((url) => url === `${ORIGIN}${API_DOCS_PATH}`),
    ).toHaveLength(1);
  });
});
