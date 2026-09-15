import { test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

const PAGES = [
  ["/dashboard", "dashboard"],
  ["/dashboard/deliveries", "deliveries"],
  ["/dashboard/routes", "routes"],
  ["/dashboard/control-tower", "tower"],
  ["/dashboard/integrations", "integrations"],
  ["/dashboard/vehicle", "vehicles"],
] as const;

async function signIn(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: "tkey", value: CONTEXT.managerTokens[0], domain: "localhost", path: "/" },
  ]);
}

for (const [path, name] of PAGES) {
  test(`contrast ${name}`, async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.addScriptTag({ content: AXE });

    const out = await page.evaluate(async () => {
      // @ts-expect-error injected
      const r = await window.axe.run(document, { runOnly: { type: "rule", values: ["color-contrast"] } });
      const lines: string[] = [];
      for (const v of r.violations) {
        for (const n of v.nodes) {
          const d = n.any?.[0]?.data ?? {};
          lines.push(
            `ratio=${d.contrastRatio} need=${d.expectedContrastRatio} fg=${d.fgColor} bg=${d.bgColor} size=${d.fontSize} ${d.fontWeight}`,
          );
          lines.push(`   sel ${String(n.target).slice(0, 110)}`);
          lines.push(`   txt ${String(n.html ?? "").replace(/<[^>]*>/g, " ").trim().slice(0, 70)}`);
        }
      }
      return lines;
    });

    console.log(`### ${name}`);
    for (const l of out) console.log(l);
  });
}
