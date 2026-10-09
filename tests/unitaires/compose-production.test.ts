// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The production web container, as the Swarm stack runs it.
 *
 * It shares one host with the API, Postgres and Redis. With no memory limit a
 * Next server that grows without bound competes with the database for the same
 * RAM, and the kernel's OOM victim is unpredictable (INFRA-12).
 */
const compose = readFileSync(
  resolve(process.cwd(), "compose.production.yaml"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("the web container's restarts", () => {
  it("never stop for good (INFRA-15)", () => {
    // `max_attempts: 3` with no window counted restarts over the whole life of
    // the spec: three unhealthy episodes spread over weeks and Swarm stopped
    // recreating the task until the next deploy — the site down with nobody
    // told. The web is stateless; restarting costs nothing.
    const code = compose.replace(/^\s*#.*$/gm, "");

    expect(code).toMatch(/restart_policy:\n\s+condition: any/);
    expect(code).not.toMatch(/max_attempts:/);
  });
});

describe("the web container's memory", () => {
  it("has a ceiling, and a V8 heap that ends the process before the cgroup does", () => {
    const limit = compose.match(
      /resources:\n\s+limits:\n\s+memory: \$\{UI_MEMORY_LIMIT:-(\d+)M\}/,
    );
    const heap = compose.match(
      /NODE_OPTIONS: --max-old-space-size=\$\{UI_HEAP_MB:-(\d+)\}/,
    );

    expect(limit, "deploy.resources.limits.memory").not.toBeNull();
    expect(heap, "NODE_OPTIONS com --max-old-space-size").not.toBeNull();
    expect(Number(heap![1])).toBeLessThanOrEqual(Number(limit![1]) * 0.8);
  });
});
