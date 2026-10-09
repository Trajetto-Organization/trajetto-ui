// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What the pipelines actually run before code reaches main.
 *
 * Both workflows ran `yarn test:unit` and nothing else. The Playwright
 * suites — the chat message window, the route and delivery rules, the
 * accessibility of the forms, the screens against a real stack — ran on
 * nobody's machine but the author's, while ci.yml said deploy.yml ran them and
 * vitest.config.ts said CI ran them "as before". A PR that broke the message
 * window or took `aria-invalid` off a field went green.
 */
const read = (...path: string[]) =>
  readFileSync(resolve(process.cwd(), ...path), "utf8");

const workflow = (name: string) => read(".github", "workflows", name);

/** One job's body, from its key to the next job at the same indentation. */
function job(source: string, name: string): string {
  const start = source.indexOf(`\n  ${name}:`);
  expect(start, `job ${name}`).toBeGreaterThan(-1);

  const rest = source.slice(start + 1);
  const next = rest.slice(1).search(/\n  [\w-]+:\r?\n/);

  return next < 0 ? rest : rest.slice(0, next + 1);
}

describe("the rules suite (tests/E2E)", () => {
  const scripts = JSON.parse(read("package.json")).scripts as Record<
    string,
    string
  >;

  it("has a script that runs it once, not once per browser", () => {
    expect(scripts["test:rules"]).toMatch(/^playwright test\b/);
    expect(scripts["test:rules"]).toContain("--project=chromium");
  });

  it("runs on every branch push", () => {
    expect(job(workflow("ci.yml"), "validate")).toContain(
      "run: yarn test:rules",
    );
  });

  it("runs in the validation staging calls before it builds an image", () => {
    // deploy.yml reuses ci.yml itself, so the gate cannot drift from the
    // branch CI's.
    expect(workflow("ci.yml")).toMatch(/\n {2}workflow_call:\r?\n/);
    expect(job(workflow("deploy.yml"), "validate")).toContain(
      "uses: ./.github/workflows/ci.yml",
    );
    expect(job(workflow("deploy.yml"), "build")).toMatch(
      /needs: \[validate, browser-suites\]/,
    );
  });

  it("runs on every pull request to main", () => {
    expect(workflow("ci.yml")).toMatch(
      /\n {2}pull_request:\r?\n {4}branches: \[main\]\r?\n/,
    );
  });

  it("never asks for a browser, so CI needs none installed", () => {
    const dir = resolve(process.cwd(), "tests", "E2E");

    for (const file of readdirSync(dir)) {
      const source = readFileSync(resolve(dir, file), "utf8");

      // A browser fixture here would make `test:rules` need `playwright
      // install` — those tests belong in tests/ui with the running stack.
      expect(source, file).not.toMatch(
        /async\s*\(\s*\{[^}]*\b(page|context|browser)\b/,
      );
    }
  });
});

describe("the suites that need a running stack", () => {
  const path = resolve(
    process.cwd(),
    ".github",
    "workflows",
    "browser-suites.yml",
  );

  it("have a workflow of their own", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("run every night and on demand", () => {
    const source = read(".github", "workflows", "browser-suites.yml");

    expect(source).toMatch(/schedule:\s*\r?\n(?:\s*#.*\r?\n)*\s*- cron: /);
    expect(source).toContain("workflow_dispatch:");
  });

  it("run the ui, a11y and responsive configs against a real browser", () => {
    const source = read(".github", "workflows", "browser-suites.yml");

    expect(source).toContain("playwright install --with-deps chromium");

    for (const config of [
      "playwright.ui.config.ts",
      "playwright.a11y.config.ts",
      "playwright.responsive.config.ts",
    ]) {
      expect(source).toContain(`-c ${config}`);
    }
  });

  it("gate the staging image and every pull request to main", () => {
    const source = read(".github", "workflows", "browser-suites.yml");

    expect(source).toMatch(/\n {2}workflow_call:\r?\n/);
    expect(source).toMatch(
      /\n {2}pull_request:\r?\n {4}branches: \[main\]\r?\n/,
    );
    expect(job(workflow("deploy.yml"), "browser-suites")).toContain(
      "uses: ./.github/workflows/browser-suites.yml",
    );
  });

  it("skip with a warning, not a failure, while the API token is missing", () => {
    const source = read(".github", "workflows", "browser-suites.yml");

    expect(job(source, "gate")).toContain(
      "TOKEN: ${{ secrets.API_REPO_READ_TOKEN }}",
    );
    expect(job(source, "browser-suites")).toContain(
      "if: needs.gate.outputs.enabled == 'true'",
    );
  });

  it("seed the API the specs read their context from", () => {
    const source = read(".github", "workflows", "browser-suites.yml");

    expect(source).toContain("tests/load/seed.ts");
    expect(source).toContain("PORT: 3334");
    expect(source).toContain("PORT: 3100");
  });

  it("mint the MASTER sessions the /admin specs open with", () => {
    // tests/ui/support/operation.ts reads browser-sessions.json, which only
    // mint-master.ts writes: without it every master spec threw.
    expect(read(".github", "workflows", "browser-suites.yml")).toContain(
      "npx tsx tests/load/mint-master.ts",
    );
  });

  it("serve the web from the standalone server the image runs, not `next start`", () => {
    const source = read(".github", "workflows", "browser-suites.yml");

    expect(source).toContain("node .next/standalone/server.js");
    expect(source).not.toMatch(/yarn start|next start -p/);
  });

  it("need no Sanity secret any more", () => {
    expect(read(".github", "workflows", "browser-suites.yml")).not.toMatch(
      /SANITY/,
    );
  });
});

describe("what the comments claim", () => {
  it("no longer says CI runs Playwright when it does not", () => {
    expect(read("vitest.config.ts")).not.toContain("CI runs them as before");
    expect(workflow("ci.yml")).not.toMatch(
      /Intentionally excluded: Playwright tests/,
    );
  });
});
