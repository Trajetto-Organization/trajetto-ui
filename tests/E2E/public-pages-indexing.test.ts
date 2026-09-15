import { test, expect } from "@playwright/test";

import robots from "../../src/app/robots";

/**
 * The tokenised pages must never be indexed, and this is not a preference.
 *
 * `/verificar/:token` and `/acompanhar/:token` have no login by design — the
 * token in the URL is the whole authorisation. That is exactly why a crawler
 * must never reach one: indexing a tracking link would put somebody's
 * delivery, their name and their city into a search engine, permanently, for a
 * link meant only for them.
 *
 * A rule like this is invisible: nothing breaks when it is dropped, nobody
 * notices for months, and then a customer finds their own delivery on Google.
 * So it gets a test.
 */
const TOKENISED = ["/verificar/*", "/acompanhar/*"];

function ruleSets() {
  const rules = robots().rules;

  return Array.isArray(rules) ? rules : [rules];
}

test.describe("robots.txt", () => {
  test("blocks the tokenised pages for every crawler that has a disallow list", () => {
    const withDisallow = ruleSets().filter((rule) => rule.disallow);

    expect(withDisallow.length).toBeGreaterThan(0);

    for (const rule of withDisallow) {
      const disallow = Array.isArray(rule.disallow)
        ? rule.disallow
        : [rule.disallow];

      // A rule that blocks everything already covers these.
      if (disallow.includes("/")) continue;

      for (const path of TOKENISED) {
        expect(
          disallow,
          `${JSON.stringify(rule.userAgent)} must block ${path}`,
        ).toContain(path);
      }
    }
  });

  test("never allows them by accident", () => {
    for (const rule of ruleSets()) {
      const allow = Array.isArray(rule.allow)
        ? rule.allow
        : rule.allow
          ? [rule.allow]
          : [];

      for (const entry of allow) {
        expect(entry).not.toContain("verificar");
        expect(entry).not.toContain("acompanhar");
      }
    }
  });

  test("still lets the marketing site be found", () => {
    // The other half of the rule: blocking too much would be its own bug, and
    // a test that only checks the blocks would pass on an empty allow list.
    const general = ruleSets().find((rule) => rule.userAgent === "*");

    const allow = Array.isArray(general?.allow)
      ? general!.allow
      : [general?.allow];

    expect(allow).toContain("/");
    expect(allow).toContain("/about");
  });
});
