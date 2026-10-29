// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The Swarm settings of the trajetto-ui Dokploy Application.
 *
 * The web runs as a Dokploy Application (provider Docker, image from GHCR),
 * not as a stack file: its health check, update/rollback policy, restart
 * policy and memory ceiling live in the panel, and docs/deploy.md section 6.4
 * is the one versioned record of them. These are the facts the old compose
 * file guarded (INFRA-12, INFRA-15), read from the JSON the owner pastes.
 */
const read = (...path: string[]) =>
  readFileSync(resolve(process.cwd(), ...path), "utf8").replace(/\r\n/g, "\n");

const deploy = read("docs", "deploy.md");
const dockerfile = read("Dockerfile");
const waitForBuild = read(".github", "scripts", "wait-for-build.mjs");

function section(heading: string): string {
  const from = deploy.indexOf(`\n### ${heading}`);

  expect(from, heading).toBeGreaterThan(-1);

  const rest = deploy.slice(from + 1);
  const next = rest.slice(1).search(/\n##+ /);

  return next < 0 ? rest : rest.slice(0, next + 1);
}

/** Each `_Label_:` followed by a ```json block, parsed. */
function swarmSettings(): Record<string, Record<string, unknown>> {
  const text = section("6.4");
  const settings: Record<string, Record<string, unknown>> = {};

  for (const match of text.matchAll(
    /_([A-Z][\w ]+)_[^\n]*\n\n```json\n([\s\S]*?)\n```/g,
  )) {
    settings[match[1]] = JSON.parse(match[2]);
  }

  return settings;
}

const SECOND = 1_000_000_000;

describe("the trajetto-ui Application's Swarm settings", () => {
  const settings = swarmSettings();

  it("probes the same endpoint as the image's own HEALTHCHECK", () => {
    const image = dockerfile.match(
      /^HEALTHCHECK [^\n]*\\\n\s+CMD wget -q -O \/dev\/null (\S+)$/m,
    )?.[1];

    expect(image, "HEALTHCHECK no Dockerfile").toBe(
      "http://127.0.0.1:3000/api/health",
    );
    expect(settings["Health Check"]?.Test).toEqual([
      "CMD",
      "wget",
      "-q",
      "-O",
      "/dev/null",
      image,
    ]);
  });

  it("starts the new task first and rolls back on its own", () => {
    const update = settings["Update Config"];

    expect(update?.Order).toBe("start-first");
    expect(update?.FailureAction).toBe("rollback");
    expect(update?.Monitor).toBeGreaterThanOrEqual(30 * SECOND);
    expect(settings["Rollback Config"]?.Order).toBe("start-first");
  });

  it("is watched by the pipeline for longer than Swarm's rollback window", () => {
    const stable = Number(
      waitForBuild.match(/WAIT_STABLE_SECONDS \|\| (\d+)\)/)?.[1],
    );

    expect(stable * SECOND).toBeGreaterThan(
      Number(settings["Update Config"]?.Monitor),
    );
  });

  it("never stops restarting for good (INFRA-15)", () => {
    // A MaxAttempts with no window counts restarts over the whole life of the
    // spec: three unhealthy episodes spread over weeks and Swarm stops
    // recreating the task until the next deploy.
    const restart = settings["Restart Policy"];

    expect(restart?.Condition).toBe("any");
    expect(restart).not.toHaveProperty("MaxAttempts");
  });

  it("has a memory ceiling, with a V8 heap that ends the process first (INFRA-12)", () => {
    const limit = Number(
      section("6.4").match(/_Memory Limit_ = `(\d+)`/)?.[1] ?? Number.NaN,
    );
    const heap = Number(
      section("6.2").match(/^NODE_OPTIONS=--max-old-space-size=(\d+)$/m)?.[1] ??
        Number.NaN,
    );

    expect(limit, "Advanced → Resources → Memory Limit").toBeGreaterThan(0);
    expect(heap, "NODE_OPTIONS no Environment").toBeGreaterThan(0);
    expect(heap * 1024 * 1024).toBeLessThanOrEqual(limit * 0.8);
  });
});
