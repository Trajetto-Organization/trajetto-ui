// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What the browser-suites job must hand the stack for the suites' harness to
 * work (tests/ui/support/hermetic.ts, docs/testes.md).
 *
 * - The same RATE_LIMIT_FORWARDER_SECRET for the API, the web and the
 *   Playwright process (job level): each browser context is a person with
 *   an address of its own for the API's per-address login limit. Without
 *   it every login of the run shares one bucket again, and the login
 *   helpers stop with "a API limitou o login por endereço".
 * - TURNSTILE_SITEVERIFY_URL on the web's server, pointing at the local
 *   double the Playwright configs start: the login's captcha check never
 *   goes to Cloudflare.
 * - Traces uploaded on every finished run, not only on failure: a test
 *   that passed on its retry is a warning in the summary, and its first
 *   attempt's trace is what explains it.
 */
const workflow = readFileSync(
  resolve(process.cwd(), ".github", "workflows", "browser-suites.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

/** The suites job, from its key to the end of the file (it is the last job). */
const job = workflow.slice(workflow.indexOf("\n  browser-suites:"));

/** The job-level env block: between `    env:` and `    steps:`. */
const jobEnv = (() => {
  const from = job.indexOf("\n    env:\n");
  const to = job.indexOf("\n    steps:\n");

  return from >= 0 && to > from ? job.slice(from, to) : "";
})();

/** Each step, from its `- name:` to the next. */
const steps = job
  .split(/\n      - name: /)
  .slice(1)
  .map((step) => `- name: ${step}`);

const step = (name: string) =>
  steps.find((candidate) => candidate.startsWith(`- name: ${name}`)) ?? "";

describe("browser-suites.yml hands the harness what it needs", () => {
  it("gives the API, the web and Playwright one forwarder secret (job level)", () => {
    const value = /\n {6}RATE_LIMIT_FORWARDER_SECRET: (\S+)/.exec(jobEnv)?.[1];

    expect(
      value,
      "RATE_LIMIT_FORWARDER_SECRET no env do job browser-suites (docs/testes.md)",
    ).toBeTruthy();
    // The API and the web refuse a shorter one.
    expect(value!.replace(/^["']|["']$/g, "").length).toBeGreaterThanOrEqual(
      32,
    );

    // Never overridden per step: one value for the three processes.
    for (const candidate of steps) {
      expect(candidate).not.toMatch(/RATE_LIMIT_FORWARDER_SECRET:/);
    }
  });

  it("points the web's captcha check at the local siteverify double", () => {
    expect(step("Web — start on 3100")).toMatch(
      /\n {10}TURNSTILE_SITEVERIFY_URL: "?http:\/\/127\.0\.0\.1:3199\/turnstile\/v0\/siteverify"?\n/,
    );
  });

  it("keeps the Cloudflare test keys, the only ones the double may stand in for", () => {
    const web = step("Web — start on 3100");

    expect(web).toContain(
      "TURNSTILE_SECRET_KEY: 1x0000000000000000000000000000000AA",
    );
  });

  it("uploads the traces of every finished run, not only of a failed one", () => {
    const upload = step("Upload traces and server logs");

    expect(upload, "o passo de upload sumiu").not.toBe("");
    expect(upload).not.toMatch(/\n {8}if: \$\{\{ failure\(\) \}\}\n/);
    expect(upload).toMatch(/\n {8}if: \$\{\{ !cancelled\(\) \}\}\n/);
    expect(upload).toContain("trajetto-ui/test-results");
  });
});
