// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import postcss from "postcss";
import tailwindcss from "tailwindcss";
import loadConfig from "tailwindcss/loadConfig";
import { describe, expect, it } from "vitest";

/**
 * The app and the auth pages read in Inter, like the public site (decision
 * 16.122). They used Tailwind's default stack, so on Windows "Acessar
 * plataforma" led from Inter into Segoe UI, as if into another product.
 */
const ROOT = process.cwd();

describe("the app's text face", () => {
  it("puts Inter first in the sans stack Tailwind's preflight sets on <html>", async () => {
    const config = loadConfig(path.join(ROOT, "tailwind.config.ts"));
    const { css } = await postcss([
      tailwindcss({
        ...config,
        content: [{ raw: "font-sans", extension: "html" }],
      }),
    ]).process("@tailwind base; @tailwind utilities;", { from: undefined });

    const html = /(?:^|\n)html,\s*:host \{[^}]*font-family: ([^;]+);/.exec(css);

    expect(html?.[1]).toMatch(/^var\(--font-inter\), ui-sans-serif, system-ui/);
    expect(css).toMatch(/\.font-sans \{\s*font-family: var\(--font-inter\)/);
  }, 30_000);

  it("loads the weights the app uses, bold included, on <html>", () => {
    const layout = readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
    const inter =
      /const inter = Inter\(\{[\s\S]*?\}\);/.exec(layout)?.[0] ?? "";

    // font-medium (616 uses), font-semibold (242), font-bold (47): without
    // 700 the browser fakes the bold.
    for (const weight of ["400", "500", "600", "700"])
      expect(inter).toContain(`"${weight}"`);
    expect(layout).toMatch(/<html[\s\S]*className=\{`\$\{inter\.variable\}/);
  });

  it("lets the maps' popups and credits inherit it instead of Leaflet's Helvetica", () => {
    const css = readFileSync(
      path.join(ROOT, "src/features/control-tower/lib/leaflet-theme.css"),
      "utf8",
    );

    expect(css).toMatch(
      /\.leaflet-container\.leaflet-container \{\s*font-family: inherit;/,
    );
  });
});
