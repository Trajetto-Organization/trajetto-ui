import { test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

test("o tema no html", async ({ page }) => {
  await page.context().addCookies([
    { name: "tkey", value: CONTEXT.managerTokens[0], domain: "localhost", path: "/" },
  ]);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle", timeout: 60000 });

  console.log(await page.evaluate(() => {
    const h = document.documentElement;
    const body = getComputedStyle(document.body);
    return [
      `html class="${h.className}"`,
      `html data-theme="${h.getAttribute("data-theme")}"`,
      `localStorage.theme=${localStorage.getItem("theme")}`,
      `body background=${body.backgroundColor}`,
    ].join(String.fromCharCode(10));
  }));
});
