// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * The image runs before it is pushed (§14/§19: smoke test of the final
 * image).
 *
 * The first run of a freshly built image used to be the staging deploy: a
 * base image change or a file pruned too far would only show as a staging
 * rollback. The build job now loads the image into the runner, starts it
 * offline and waits for its own HEALTHCHECK, checks the commit it serves and
 * the image optimizer (sharp), and only then pushes — the same build, from
 * the builder's cache.
 *
 * The step's `run:` block is executed with docker and sleep stubbed: a list
 * of canned container states stands in for the daemon.
 */
const workflow = readFileSync(
  resolve(process.cwd(), ".github", "workflows", "deploy.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

const buildJob = (() => {
  const from = workflow.indexOf("\n  build:\n");
  const rest = workflow.slice(from + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][\w-]*:\n/);

  return next < 0 ? rest : rest.slice(0, next + 1);
})();

const steps = buildJob
  .split(/\n {6}- name: /)
  .slice(1)
  .map((chunk) => ({ name: chunk.split("\n")[0], text: chunk }));

const stepText = (name: string) =>
  steps.find((step) => step.name === name)?.text ?? "";

const SMOKE_BUILD = "Build the image for the smoke test";
const SMOKE = "Smoke test the image";
const PUSH = "Build and push Docker image";

/** A build step's `with:` inputs; block values keep their lines. */
function inputs(text: string): Record<string, string> {
  const lines = text.split("\n");
  const values: Record<string, string> = {};
  let key = "";

  for (const line of lines.slice(
    lines.findIndex((each) => /^ {8}with:$/.test(each)) + 1,
  )) {
    const entry = /^ {10}([\w-]+):\s*(.*)$/.exec(line);

    if (entry) {
      key = entry[1];
      values[key] = entry[2];
    } else if (/^ {12}\S/.test(line) && key) {
      values[key] += `\n${line.trim()}`;
    } else if (!/^ {10}#/.test(line) && line.trim() !== "") {
      break;
    }
  }

  return values;
}

/** The `run: |` block of a step, dedented. */
function runBlock(name: string): string {
  const lines = stepText(name).split("\n");
  const at = lines.findIndex((line) => /^\s+run: \|$/.test(line));

  expect(at, `${name}: run`).toBeGreaterThan(-1);

  const indent = lines[at].search(/\S/) + 2;
  const body: string[] = [];

  for (const line of lines.slice(at + 1)) {
    if (line.trim() !== "" && line.search(/\S/) < indent) break;

    body.push(line.slice(indent));
  }

  return body.join("\n");
}

describe("the smoke test of the web image", () => {
  it("runs between the metadata and the push, on the build the push publishes", () => {
    const names = steps.map((step) => step.name);

    expect(names.indexOf(SMOKE_BUILD)).toBeGreaterThan(
      names.indexOf("Extract metadata"),
    );
    expect(names.indexOf(SMOKE)).toBe(names.indexOf(SMOKE_BUILD) + 1);
    expect(names.indexOf(PUSH)).toBe(names.indexOf(SMOKE) + 1);

    const smoke = inputs(stepText(SMOKE_BUILD));
    const push = inputs(stepText(PUSH));

    // Loaded into the runner, never published; no attestations (the classic
    // image store cannot load them) and no cache export (the push writes it).
    expect(smoke.push).toBe("false");
    expect(smoke.load).toBe("true");

    for (const key of ["sbom", "provenance", "cache-to"]) {
      expect(smoke[key], key).toBeUndefined();
    }

    // The same inputs, so the push finds every layer in the builder's cache
    // and publishes what ran here.
    for (const key of [
      "context",
      "file",
      "build-args",
      "cache-from",
      "labels",
    ]) {
      expect(smoke[key], key).toBe(push[key]);
    }

    expect(push.push).toBe("true");
  });

  it("starts the container offline, with throwaway values and no secret", () => {
    const run = runBlock(SMOKE);

    expect(run).toContain("docker run -d --network none");

    // It polls for longer than the start period it gives the container.
    const start = Number(/--health-start-period (\d+)s/.exec(run)?.[1]);
    const polls = Number(/for _ in \$\(seq 1 (\d+)\)/.exec(run)?.[1]);
    const pause = Number(/\n\s+sleep (\d+)\n/.exec(run)?.[1]);

    expect(run).toMatch(/--health-interval \d+s --health-start-period \d+s/);
    expect(polls * pause).toBeGreaterThan(start);
    expect(run).toContain("TURNSTILE_SITE_KEY=1x00000000000000000000AA");
    expect(stepText(SMOKE)).not.toContain("secrets.");
    expect(run).toContain('trap \'docker rm -f "$cid"');

    // A request that hangs (a stuck native dependency) fails here at once,
    // instead of holding the deploy queue until the job's timeout.
    const fetches = run.match(/fetch\('[^']+'[^)]*\)/g) ?? [];

    expect(fetches).toHaveLength(2);

    for (const call of fetches) {
      expect(call).toMatch(/signal: AbortSignal\.timeout\(\d+\)/);
    }
  });
});

/** Whether a POSIX bash that reads this repository's paths is available. */
function hasBash(): boolean {
  const probe = spawnSync(
    "bash",
    [
      "-c",
      `test -r "${resolve(process.cwd(), "package.json").replace(/\\/g, "/")}"`,
    ],
    { encoding: "utf8" },
  );

  return !probe.error && probe.status === 0;
}

describe.skipIf(!hasBash())("the smoke test, run with docker stubbed", () => {
  const SHA = "abcdef0123456789abcdef0123456789abcdef01";
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "trajetto-smoke-")).replace(/\\/g, "/");
    mkdirSync(`${root}/bin`);

    // `inspect` answers the canned states in order, the last one for good.
    // Shell builtins only: the "never healthy" case polls 60 times, and
    // every extra process costs on Windows.
    writeFileSync(
      `${root}/bin/docker`,
      [
        "#!/bin/sh",
        `printf '%s\\n' "docker $*" >> "${root}/calls"`,
        'case "$1" in',
        "  run) echo cid-smoke ;;",
        "  inspect)",
        `    n=1; [ -f "${root}/n" ] && read -r n < "${root}/n"`,
        "    at=0",
        "    while IFS= read -r line; do",
        '      at=$((at + 1)); state="$line"',
        '      [ "$at" -ge "$n" ] && break',
        `    done < "${root}/states"`,
        `    echo $((n + 1)) > "${root}/n"`,
        '    echo "$state" ;;',
        "  exec)",
        '    case "$*" in',
        `      *build-id.json*) cat "${root}/sha" ;;`,
        `      *_next/image*) cat "${root}/avif" ;;`,
        "    esac ;;",
        "  logs) echo 'next-server: log line' ;;",
        "esac",
        "",
      ].join("\n"),
    );
    writeFileSync(`${root}/bin/sleep`, "#!/bin/sh\nexit 0\n");
    // Three polls instead of sixty: each one spawns processes, which is slow
    // on Windows. The real budget is checked on the text (above).
    writeFileSync(`${root}/bin/seq`, "#!/bin/sh\necho 1 2 3\n");

    for (const stub of ["docker", "sleep", "seq"]) {
      chmodSync(`${root}/bin/${stub}`, 0o755);
    }
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function smoke({
    states,
    sha = SHA,
    avif = "200 image/avif",
  }: {
    states: string[];
    sha?: string;
    avif?: string;
  }) {
    writeFileSync(`${root}/states`, `${states.join("\n")}\n`);
    writeFileSync(`${root}/sha`, `${sha}\n`);
    writeFileSync(`${root}/avif`, `${avif}\n`);
    writeFileSync(`${root}/summary`, "");
    writeFileSync(`${root}/calls`, "");
    writeFileSync(`${root}/step.sh`, `set -eo pipefail\n${runBlock(SMOKE)}`);

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GITHUB_SHA: SHA,
      GITHUB_STEP_SUMMARY: `${root}/summary`,
      IMAGE: "trajetto-ui:smoke",
    };

    // Windows spells it `Path`; two spellings in one block is ambiguous.
    for (const key of Object.keys(env)) {
      if (key.toUpperCase() === "PATH") delete env[key];
    }

    env.PATH = `${root}/bin${delimiter}${process.env.PATH}`;

    const result = spawnSync("bash", [`${root}/step.sh`], {
      env,
      encoding: "utf8",
      timeout: 30_000,
    });
    const calls = readFileSync(`${root}/calls`, "utf8")
      .split("\n")
      .filter(Boolean);

    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`,
      summary: readFileSync(`${root}/summary`, "utf8"),
      calls,
    };
  }

  it("passes a container that turns healthy and serves this commit and an AVIF", () => {
    const result = smoke({
      states: ["running/starting", "running/starting", "running/healthy"],
    });

    expect(result.status, result.output).toBe(0);
    expect(result.summary).toContain("smoke test OK");
    expect(
      result.calls.filter((call) => call.startsWith("docker inspect")),
    ).toHaveLength(3);
    // Removed on the way out, pass or fail.
    expect(result.calls.at(-1)).toBe("docker rm -f cid-smoke");
  });

  it("fails, with the container's log, when it exits or turns unhealthy", () => {
    for (const state of ["exited/unhealthy", "running/unhealthy"]) {
      const result = smoke({ states: ["running/starting", state] });

      expect(result.status, state).toBe(1);
      expect(result.output).toContain(
        `::error::Smoke test da imagem: o container não ficou saudável (${state})`,
      );
      expect(result.output).toContain("next-server: log line");
      expect(result.summary).toBe("");
      expect(result.calls.at(-1)).toBe("docker rm -f cid-smoke");
    }
  });

  it("fails when the image serves another build or no AVIF", () => {
    const stale = smoke({ states: ["running/healthy"], sha: "0".repeat(40) });

    expect(stale.status).toBe(1);
    expect(stale.output).toContain("/build-id.json respondeu");

    const noSharp = smoke({
      states: ["running/healthy"],
      avif: "200 image/png",
    });

    expect(noSharp.status).toBe(1);
    expect(noSharp.output).toContain("o otimizador de imagens respondeu");
  });

  it("gives up when it never leaves starting", () => {
    const result = smoke({ states: ["running/starting"] });

    expect(result.status).toBe(1);
    expect(result.output).toContain("(running/starting)");
    expect(
      result.calls.filter((call) => call.startsWith("docker inspect")),
    ).toHaveLength(3);
    expect(result.calls.at(-1)).toBe("docker rm -f cid-smoke");
  });
});
