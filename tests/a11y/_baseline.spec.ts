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
  ["/dashboard/control-tower", "control tower"],
  ["/dashboard/integrations", "integrations"],
  ["/dashboard/vehicle", "vehicles"],
] as const;

async function signIn(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: "tkey", value: CONTEXT.managerTokens[0], domain: "localhost", path: "/" },
  ]);
}

for (const [path, name] of PAGES) {
  test(`axe ${name}`, async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.addScriptTag({ content: AXE });

    const result = await page.evaluate(async () => {
      // @ts-expect-error injected
      return await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
    });

    const lines = (result.violations as any[]).map(
      (v) => `${v.impact ?? "?"} | ${v.id} | ${v.nodes.length}x | ${v.help}`,
    );
    console.log(`### ${name} (${lines.length} regras)`);
    for (const l of lines) console.log("   " + l);
    for (const v of result.violations as any[]) {
      for (const n of v.nodes.slice(0, 2)) {
        console.log(`      [${v.id}] ${String(n.target).slice(0, 90)}`);
        console.log(`         ${String(n.failureSummary ?? "").split("\n").join(" / ").slice(0, 160)}`);
      }
    }
  });
}
