import { test, expect } from "./support/test";

/**
 * Decision 16.20, against the running server: the old English institutional
 * paths answer 308 with the Portuguese page in Location (query kept), and
 * the new pages render with their own canonical. No session needed.
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

const MOVED: ReadonlyArray<[string, string]> = [
  ["/about", "/sobre"],
  ["/contact", "/contato"],
  ["/quote", "/orcamento"],
];

test.describe("public slugs", () => {
  for (const [legacy, page] of MOVED) {
    test(`${legacy} answers 308 to ${page}`, async ({ request }) => {
      const response = await request.get(`${BASE}${legacy}?utm_source=x`, {
        maxRedirects: 0,
      });

      expect(response.status()).toBe(308);
      const location = new URL(response.headers()["location"] ?? "", BASE);
      expect(location.pathname).toBe(page);
      expect(location.searchParams.get("utm_source")).toBe("x");
    });

    test(`${page} renders with its own canonical`, async ({ request }) => {
      const response = await request.get(`${BASE}${page}`, { maxRedirects: 0 });

      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toMatch(
        new RegExp(`<link rel="canonical" href="[^"]*${page}"`),
      );
    });
  }
});
