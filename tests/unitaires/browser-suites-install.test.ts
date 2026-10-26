// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The nightly browser job installs before it builds.
 *
 * Yarn 1 skips every devDependency when NODE_ENV is production. The web's
 * build needs several of them (typescript, tailwindcss, postcss, the bundle
 * analyzer next.config.mjs loads) and the suites need @playwright/test, so an
 * install in a step that sets NODE_ENV=production leaves `next build` without
 * them and the job fails before a single spec runs.
 */
const workflow = readFileSync(
  resolve(process.cwd(), ".github", "workflows", "browser-suites.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

/** Each step of the workflow, from its `- name:` to the next. */
const steps = workflow
  .split(/\n      - name: /)
  .slice(1)
  .map((step) => `- name: ${step}`);

describe("browser-suites.yml", () => {
  it("never installs with devDependencies switched off", () => {
    const installs = steps.filter((step) => /\byarn install\b/.test(step));

    expect(installs.length).toBeGreaterThan(0);

    for (const step of installs) {
      const production = /\bNODE_ENV: production\b/.test(step);
      const forced = /yarn install[^\n]*--production=false/.test(step);

      expect(
        !production || forced,
        `${step.split("\n")[0]} installs under NODE_ENV=production`,
      ).toBe(true);
    }
  });

  it("runs the browsers on a pinned Ubuntu Playwright supports, not ubuntu-latest", () => {
    // ubuntu-latest moved to 26.04 and `playwright install --with-deps
    // chromium` (1.56) refused it: "does not support chromium on
    // ubuntu26.04-x64". A pinned image moves only when Playwright does.
    const job = workflow.slice(workflow.indexOf("\n  browser-suites:"));
    const runner = /\n    runs-on: (\S+)/.exec(job)?.[1];

    expect(runner).toMatch(/^ubuntu-\d{2}\.\d{2}$/);
  });

  it("mints the form-login accounts after the MASTER sessions", () => {
    // The specs that sign in through the form read browser-users.json; the
    // nightly job never wrote it and every one of them threw.
    const master = workflow.indexOf("npx tsx tests/load/mint-master.ts");
    const users = workflow.indexOf("npx tsx tests/load/mint-browser-users.ts");

    expect(master).toBeGreaterThan(-1);
    expect(users).toBeGreaterThan(master);
  });
});
