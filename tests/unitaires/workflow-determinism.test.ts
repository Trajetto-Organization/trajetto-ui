// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readWorkflow } from "./helpers/workflow-shell";

/**
 * The same commit must get the same pipeline result: nothing in the
 * workflows may move by itself, hang for hours, swallow an error in a pipe,
 * or fail the run over an optimisation (decisions D3, D4, D5 and D9,
 * 30/10/2026; the CI instability audit of the same day).
 */
const NAMES = readdirSync(
  resolve(process.cwd(), ".github", "workflows"),
).filter((name) => /\.ya?ml$/.test(name));
const WORKFLOWS = NAMES.map((name) => ({ name, text: readWorkflow(name) }));

/** Each job of a workflow: its key and its text. */
function jobsOf(text: string): Array<{ key: string; text: string }> {
  const body = text.slice(text.indexOf("\njobs:\n") + "\njobs:\n".length);

  return body
    .split(/\n(?= {2}[\w-]+:\n)/)
    .filter((chunk) => /^ {2}[\w-]+:\n/.test(chunk))
    .map((chunk) => ({ key: /^ {2}([\w-]+):/.exec(chunk)![1], text: chunk }));
}

/** Each step of a job: its name and its text. */
function stepsOf(job: string): Array<{ name: string; text: string }> {
  return job
    .split(/\n {6}- name: /)
    .slice(1)
    .map((chunk) => ({ name: chunk.split("\n")[0], text: chunk }));
}

describe("every workflow", () => {
  // ubuntu-latest began moving to 26.04 on 19/10/2026, with no commit of
  // ours (Playwright 1.56 refused it). Every job runs on a pinned image,
  // bumped by hand in the three repositories.
  it("runs every job on a pinned Ubuntu, never ubuntu-latest", () => {
    for (const { name, text } of WORKFLOWS) {
      const runners = [...text.matchAll(/\n\s+runs-on: (\S+)/g)].map(
        (match) => match[1],
      );

      expect(runners.length, name).toBeGreaterThan(0);
      for (const runner of runners) {
        expect(runner, name).toMatch(/^ubuntu-\d{2}\.\d{2}$/);
      }
    }
  });

  it.each(NAMES)("%s runs its steps under bash -eo pipefail (D5)", (name) => {
    const { text } = WORKFLOWS.find((each) => each.name === name)!;

    expect(text).toMatch(/\ndefaults:\n {2}run:\n {4}shell: bash\n/);
    // No step opts back into another shell.
    expect(text).not.toMatch(/\n\s+shell: (?!bash\n)/);
  });

  it.each(NAMES)("%s gives every job a timeout (D4)", (name) => {
    const { text } = WORKFLOWS.find((each) => each.name === name)!;

    for (const job of jobsOf(text)) {
      // A job that only calls a reusable workflow takes no timeout: the
      // called workflow's jobs carry theirs.
      if (/\n {4}uses: \.\/\.github\/workflows\//.test(job.text)) continue;

      expect(job.text, `${name}: ${job.key}`).toMatch(
        /\n {4}timeout-minutes: \d+\n/,
      );
    }
  });

  it("pins Node to the exact version of the images (D3)", () => {
    const image = /^FROM node:(\d+\.\d+\.\d+)-alpine/m.exec(
      readFileSync(resolve(process.cwd(), "Dockerfile"), "utf8"),
    )?.[1];
    const versions = WORKFLOWS.flatMap(({ text }) =>
      [...text.matchAll(/node-version: (\S+)/g)].map((match) => match[1]),
    );

    expect(image).toBe("22.21.1");
    expect(versions.length).toBeGreaterThan(0);

    for (const version of versions) expect(version).toBe(`"${image}"`);
  });

  it("runs every container from a digest (D3)", () => {
    const images = WORKFLOWS.flatMap(({ name, text }) => [
      ...[...text.matchAll(/\n\s+image: (\S+)/g)].map(
        (match) => `${name}: ${match[1]}`,
      ),
      ...[...text.matchAll(/driver-opts: image=(\S+)/g)].map(
        (match) => `${name}: ${match[1]}`,
      ),
    ]);

    expect(images.length).toBeGreaterThan(0);

    for (const image of images)
      expect(image).toMatch(/:[\w.-]+@sha256:[0-9a-f]{64}$/);
  });

  it("never fails a build over the GHA cache (D9)", () => {
    const exports = WORKFLOWS.flatMap(({ text }) =>
      [...text.matchAll(/cache-to: (\S+)/g)].map((match) => match[1]),
    );

    expect(exports.length).toBeGreaterThan(0);

    for (const value of exports) expect(value).toContain("ignore-error=true");
  });

  it("pins the BuildKit the builder runs (D3)", () => {
    expect(readWorkflow("deploy.yml")).toMatch(
      /uses: docker\/setup-buildx-action@[0-9a-f]{40} # v[\d.]+\n\s+with:\n\s+driver-opts: image=moby\/buildkit:v[\d.]+@sha256:[0-9a-f]{64}\n/,
    );
  });

  it("never fails a validation over a report upload", () => {
    for (const [name, step] of [
      ["ci.yml", "Publish the coverage report"],
      ["browser-suites.yml", "Upload traces and server logs"],
    ]) {
      const text = readWorkflow(name);
      const from = text.indexOf(`- name: ${step}`);
      const block = text.slice(from, text.indexOf("uses:", from));

      expect(block, `${name}: ${step}`).toContain("continue-on-error: true");
    }
  });

  it("does not read the output of a pipe it never checked (D5)", () => {
    for (const { name, text } of WORKFLOWS) {
      // `git ls-remote | cut` left the head empty on an error (a single
      // pipe; `||` is the handled exit code).
      expect(text, name).not.toMatch(/ls-remote[^\n]*[^|]\|[^|]/);
      // `cmd | grep -q` can kill cmd with SIGPIPE: under pipefail that is a
      // failure. The workflows grep a variable (here-string) instead.
      expect(text, name).not.toMatch(/[^|]\|\s*grep -[a-zA-Z]*q/);
    }
  });
});

describe("the caches of the browser-suites job (D9)", () => {
  const steps = stepsOf(
    jobsOf(readWorkflow("browser-suites.yml")).find(
      (job) => job.key === "browser-suites",
    )!.text,
  );
  const names = steps.map((step) => step.name);
  const step = (name: string) =>
    steps.find((each) => each.name === name)?.text ?? "";

  it("keeps Chromium, keyed on the installed Playwright, restored before the install", () => {
    expect(step("Cache Chromium")).toMatch(
      /path: ~\/\.cache\/ms-playwright\n\s+key: playwright-chromium-\$\{\{ runner\.os \}\}-\$\{\{ steps\.playwright\.outputs\.version \}\}\n/,
    );
    expect(step("Read the Playwright version")).toContain(
      'require("./node_modules/@playwright/test/package.json").version',
    );
    expect(names.indexOf("Cache Chromium")).toBeLessThan(
      names.indexOf("Install Chromium"),
    );
    expect(
      names.indexOf("Web — install and build against the local API"),
    ).toBeLessThan(names.indexOf("Read the Playwright version"));
  });

  it("keeps Prisma's engines, keyed on the API's engines version, restored before the API's install", () => {
    expect(step("Cache the Prisma engines")).toMatch(
      /path: ~\/\.cache\/prisma\n\s+key: prisma-engines-\$\{\{ runner\.os \}\}-\$\{\{ steps\.prisma\.outputs\.version \}\}\n/,
    );
    expect(names.indexOf("Cache the Prisma engines")).toBeLessThan(
      names.indexOf(
        "API — install, migrate, seed and mint the browser sessions",
      ),
    );
  });

  it("keeps the API console's renderer, restored after the web's install", () => {
    expect(step("Cache the API console renderer")).toContain(
      "path: trajetto-ui/node_modules/.cache/trajetto-e2e",
    );
    expect(
      names.indexOf("Web — install and build against the local API"),
    ).toBeLessThan(names.indexOf("Cache the API console renderer"));
  });
});
