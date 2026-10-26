// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What the image scan (Trivy, deploy.yml) is allowed to find.
 *
 * Enforced (IMAGE_SCAN_ENFORCE=true), the first run failed on three things:
 * the base image's OpenSSL, the npm the Node image ships (its bundled `tar`),
 * and the three Next advisories already reasoned out in audit-ci.jsonc,
 * which Trivy does not read. The runtime runs `node server.js` and needs no
 * package manager; the base packages are upgraded at build time; and Trivy
 * reads the same exceptions, each with its reason and a review date.
 */
const root = process.cwd();
const read = (file: string) =>
  readFileSync(resolve(root, file), "utf8").replace(/\r\n/g, "\n");

const dockerfile = read("Dockerfile");
const runner = dockerfile.slice(dockerfile.indexOf("FROM base AS runner"));
const base = dockerfile.slice(
  dockerfile.indexOf(" AS base"),
  dockerfile.indexOf("FROM base AS builder"),
);

describe("the image the scanner reads", () => {
  it("ships no package manager in the runtime stage", () => {
    for (const path of [
      "/usr/local/lib/node_modules/npm",
      "/usr/local/lib/node_modules/corepack",
      "/opt/yarn-v",
    ]) {
      expect(runner, path).toContain(path);
    }

    expect(runner).toMatch(
      /RUN rm -rf[^\n]*\/usr\/local\/lib\/node_modules\/npm/,
    );
  });

  it("takes the fixed OpenSSL from Alpine at build time", () => {
    expect(base).toMatch(/apk upgrade --no-cache[^\n]*libcrypto3[^\n]*libssl3/);
  });

  it("hands Trivy the reasoned exceptions, each with a review date", () => {
    const workflow = read(".github/workflows/deploy.yml");
    const step = workflow.slice(
      workflow.indexOf("- name: Scan the image for fixable critical"),
    );

    expect(step).toContain(".trivyignore:/.trivyignore:ro");
    expect(step).toContain("--ignorefile /.trivyignore");

    expect(existsSync(resolve(root, ".trivyignore"))).toBe(true);

    const entries = read(".trivyignore")
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.startsWith("#"));

    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      expect(entry, entry).toMatch(/^(CVE|GHSA)-[\w-]+ exp:\d{4}-\d{2}-\d{2}$/);
    }
  });
});
