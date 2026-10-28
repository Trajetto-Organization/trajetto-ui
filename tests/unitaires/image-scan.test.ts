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

/** A stage's instructions, from its FROM to the next: comments dropped. */
function stage(name: string): string {
  const lines = dockerfile
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n")
    .replace(/\\\n\s*/g, " ")
    .split("\n");
  const start = lines.findIndex((line) =>
    new RegExp(`^FROM \\S+ AS ${name}$`).test(line),
  );

  expect(start, `stage ${name}`).toBeGreaterThan(-1);

  const end = lines.findIndex((line, at) => at > start && /^FROM /.test(line));

  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}

const base = stage("base");
const runner = stage("runner");

describe("the image the scanner reads", () => {
  // The runner used to start from the Node image and `rm -rf` its npm,
  // corepack and yarn: hidden from the scanner, still in every pull (layers
  // are additive). Its base is now Alpine plus the node binary alone.
  it("ships no package manager in the runtime stage", () => {
    expect(base).toMatch(/^FROM alpine:[\d.]+@sha256:[0-9a-f]{64} AS base$/m);
    expect(runner).toMatch(/^FROM base AS runner$/m);
    expect(base.match(/^COPY .*$/gm)).toEqual([
      "COPY --link --from=node-binary /out/ /",
    ]);
    // What that stage copies out of the Node image: the binary alone.
    expect(stage("node-binary")).toMatch(
      /^RUN mkdir -p \/out\/usr\/local\/bin\s+&&\s+cp -p \/usr\/local\/bin\/node \/out\/usr\/local\/bin\/node\s+&&\s+touch /m,
    );

    for (const path of [
      "/usr/local/lib/node_modules",
      "/usr/local/bin/npm",
      "corepack",
      "/opt/yarn",
    ]) {
      expect(`${base}\n${runner}`, path).not.toContain(path);
    }
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
