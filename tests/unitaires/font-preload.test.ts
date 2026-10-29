// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Which faces the root layout preloads.
 *
 * Every next/font face declared there is preloaded by default, and the root
 * layout's preloads go out with every page — the logged-in app too, which
 * never paints the public site's faces. JetBrains Mono only sets small labels
 * (the eyebrows, a figure in a mockup), so it loads when used. Inter (the
 * whole product's text) and Inter Tight (the landing hero's <h1>, the
 * header's logo: the largest text above the fold) stay preloaded.
 */
const LAYOUT = readFileSync(
  resolve(process.cwd(), "src/app/layout.tsx"),
  "utf8",
);

/** The options object passed to `loader(...)` in the layout. */
function optionsOf(loader: string): string {
  const match = new RegExp(`=\\s*${loader}\\(\\{([\\s\\S]*?)\\}\\);`).exec(
    LAYOUT,
  );

  expect(match, loader).not.toBeNull();

  return match![1];
}

describe("the root layout's fonts", () => {
  it("does not preload JetBrains Mono", () => {
    expect(optionsOf("JetBrains_Mono")).toMatch(/preload:\s*false/);
  });

  it.each(["Inter", "Inter_Tight"])("keeps %s preloaded", (loader) => {
    expect(optionsOf(loader)).not.toMatch(/preload:\s*false/);
  });
});
