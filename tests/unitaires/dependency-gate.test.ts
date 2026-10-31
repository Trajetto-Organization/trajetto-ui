// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decide,
  dependencyManifests,
} from "../../.github/scripts/dependency-gate.mjs";

import {
  hasBash,
  readWorkflow,
  runBlock,
  sandbox,
  type Sandbox,
} from "./helpers/workflow-shell";

/**
 * When the dependency audit blocks (decision D1, 30/10/2026).
 *
 * audit-ci reads a live advisory database: a CRITICAL advisory published
 * today failed the next push of any commit, a fix that touched no
 * dependency included. The audit now always runs but blocks only a change
 * to package.json, yarn.lock, a package-lock.json or audit-ci.jsonc;
 * otherwise a finding is a warning and a section of the run summary.
 * Without a base to compare with, it blocks.
 */
const SCRIPT = resolve(
  process.cwd(),
  ".github",
  "scripts",
  "dependency-gate.mjs",
);
const BASE = "a".repeat(40);
const HEAD = "b".repeat(40);

const deps = (files: string[] | Error, present = true, fetched = false) => ({
  hasCommit: () => present,
  fetchCommit: () => fetched,
  changedFiles: () => {
    if (files instanceof Error) throw files;
    return files;
  },
});

describe("dependencyManifests", () => {
  it("knows the files that decide the tree, or the audit's allowlist", () => {
    expect(
      dependencyManifests([
        "package.json",
        "yarn.lock",
        "package-lock.json",
        "audit-ci.jsonc",
        "tools/x/package.json",
        "src/app/page.tsx",
        "docs/deploy.md",
        "package.json.bak",
        ".github/workflows/ci.yml",
      ]),
    ).toEqual([
      "package.json",
      "yarn.lock",
      "package-lock.json",
      "audit-ci.jsonc",
      "tools/x/package.json",
    ]);
  });
});

describe("decide", () => {
  it("does not block a change that leaves the dependencies alone", () => {
    expect(
      decide({ base: BASE, head: HEAD }, deps(["src/a.ts", "docs/x.md"])),
    ).toEqual({
      blocking: false,
      reason: expect.stringContaining(
        "não mexe em package.json, yarn.lock nem audit-ci.jsonc",
      ),
    });
  });

  it("blocks a change to the dependency tree, naming the files", () => {
    const result = decide(
      { base: BASE, head: HEAD },
      deps(["yarn.lock", "src/a.ts"]),
    );

    expect(result.blocking).toBe(true);
    expect(result.reason).toContain("mexe em yarn.lock");
  });

  it("blocks a change to the allowlist", () => {
    expect(
      decide({ base: BASE, head: HEAD }, deps(["audit-ci.jsonc"])).blocking,
    ).toBe(true);
  });

  it.each([
    ["a new branch (before is all zeros)", "0".repeat(40)],
    ["a manual run (no base)", ""],
    ["something that is not a sha", "main"],
  ])("blocks without a base: %s", (_, base) => {
    const result = decide({ base, head: HEAD }, deps(["src/a.ts"]));

    expect(result.blocking).toBe(true);
    expect(result.reason).toContain("sem commit base");
  });

  it("fetches a base the shallow checkout lacks", () => {
    expect(
      decide({ base: BASE, head: HEAD }, deps(["src/a.ts"], false, true))
        .blocking,
    ).toBe(false);
  });

  it("blocks when the base cannot be had (a rewritten history)", () => {
    const result = decide(
      { base: BASE, head: HEAD },
      deps(["src/a.ts"], false, false),
    );

    expect(result.blocking).toBe(true);
    expect(result.reason).toContain("não está disponível");
  });

  it("blocks when git cannot compare", () => {
    const result = decide(
      { base: BASE, head: HEAD },
      deps(new Error("fatal: bad object")),
    );

    expect(result.blocking).toBe(true);
    expect(result.reason).toContain("o git não comparou");
  });
});

// Every case starts processes (git, bash, node) and waits for them to
// exit. Vitest's 5 s default is a deadline for that exit, and with the whole
// unit suite saturating the cores process start-up alone can take seconds.
// The deadline is generous; the waits inside the scripts stay the fast ones
// the env sets (the same reasoning as trajetto-api's dokploy-deploy.test.ts).
describe(
  "dependency-gate.mjs against a real repository",
  { timeout: 30_000 },
  () => {
    let root: string;

    const env = () => ({
      ...process.env,
      GIT_CONFIG_GLOBAL: join(root, ".gitconfig-empty"),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_AUTHOR_NAME: "CI",
      GIT_AUTHOR_EMAIL: "ci@example.com",
      GIT_COMMITTER_NAME: "CI",
      GIT_COMMITTER_EMAIL: "ci@example.com",
    });

    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        env: env(),
      }).trim();

    function commit(files: Record<string, string>) {
      for (const [path, content] of Object.entries(files)) {
        writeFileSync(join(root, path), content);
      }

      git("add", "-A");
      git("commit", "-q", "-m", "change");

      return git("rev-parse", "HEAD");
    }

    function gate(base: string, head: string) {
      const output = join(root, ".github-output");

      writeFileSync(output, "");

      const result = spawnSync(process.execPath, [SCRIPT], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...env(),
          BASE_SHA: base,
          HEAD_SHA: head,
          GITHUB_OUTPUT: output,
          FETCH_RETRY_SECONDS: "0",
        },
      });

      return { ...result, outputs: readFileSync(output, "utf8") };
    }

    beforeEach(() => {
      root = mkdtempSync(join(tmpdir(), "trajetto-ui-deps-"));
      writeFileSync(join(root, ".gitconfig-empty"), "");
      git("init", "-q", "-b", "feature");
    });

    afterEach(() => rmSync(root, { recursive: true, force: true }));

    it("does not block a push that changed only code", () => {
      const base = commit({ "package.json": "{}\n", "a.ts": "1\n" });
      const head = commit({ "a.ts": "2\n" });
      const result = gate(base, head);

      expect(result.status, result.stderr).toBe(0);
      expect(result.outputs).toContain("blocking=false\n");
    });

    it("blocks a push that changed package.json", () => {
      const base = commit({ "package.json": "{}\n" });
      const head = commit({ "package.json": '{"name":"x"}\n' });

      expect(gate(base, head).outputs).toContain("blocking=true\n");
    });

    it("blocks when the base commit is not there and cannot be fetched", () => {
      const head = commit({ "a.ts": "1\n" });
      const result = gate("c".repeat(40), head);

      expect(result.status).toBe(0);
      expect(result.outputs).toContain("blocking=true\n");
      expect(result.outputs).toContain("não está disponível");
    });
  },
);

// Every case starts processes (git, bash, node) and waits for them to
// exit. Vitest's 5 s default is a deadline for that exit, and with the whole
// unit suite saturating the cores process start-up alone can take seconds.
// The deadline is generous; the waits inside the scripts stay the fast ones
// the env sets (the same reasoning as trajetto-api's dokploy-deploy.test.ts).
describe.skipIf(!hasBash())(
  "the audit step (ci.yml)",
  { timeout: 30_000 },
  () => {
    const STEP = runBlock(
      readWorkflow("ci.yml"),
      "Audit production dependencies",
    );
    let box: Sandbox;

    beforeEach(() => {
      box = sandbox();
    });

    afterEach(() => box.dispose());

    /**
     * The audit-ci that yarn installed (the step runs the lockfile's binary),
     * replaced by one that prints `body` and exits as it says.
     */
    function installAudit(body: string) {
      chmodSync(
        box.file(
          "node_modules/.bin/audit-ci",
          `#!/usr/bin/env bash\n${body}\n`,
        ),
        0o755,
      );
    }

    function runStep(blocking: string) {
      return box.run(STEP, {
        env: {
          BLOCKING: blocking,
          REASON:
            "a mudança não mexe em package.json, yarn.lock nem audit-ci.jsonc",
          AUDIT_RETRY_SECONDS: "0",
        },
      });
    }

    /** audit-ci's report of a finding, its verdict line included; exits `code`. */
    function audit(code: number, blocking: string) {
      installAudit(`echo "Found vulnerable advisory paths:"
echo "GHSA-abcd-efgh-jkmp next>sharp"
echo "GHSA-abcd-efgh-jkmp again"
echo "GHSA-wxyz-2345-6789 lodash"
[ ${code} -eq 0 ] || echo "Failed security audit due to critical severity vulnerabilities."
exit ${code}`);

      return runStep(blocking);
    }

    /** An audit that never reached the registry: no verdict, exit 1. */
    function unreachable(blocking: string) {
      installAudit(`echo "Error: read ECONNRESET" >&2
exit 1`);

      return runStep(blocking);
    }

    it("passes a clean audit", () => {
      const result = audit(0, "false");

      expect(result.status, result.output).toBe(0);
      expect(result.summary).toBe("");
    });

    it("turns a finding into a warning and a summary section when the dependencies did not change", () => {
      const result = audit(1, "false");

      expect(result.status, result.output).toBe(0);
      expect(result.output).toMatch(
        /::warning::audit-ci reprovou \(código 1: GHSA-abcd-efgh-jkmp GHSA-wxyz-2345-6789\)/,
      );
      expect(result.summary).toContain(
        "Audit de dependências: aviso (não bloqueia)",
      );
      expect(result.summary).toContain(
        "GHSA-abcd-efgh-jkmp GHSA-wxyz-2345-6789",
      );
    });

    it("blocks when the change touched the dependencies", () => {
      const result = audit(1, "true");

      expect(result.status).toBe(1);
      expect(result.output).toContain("::error::audit-ci reprovou");
    });

    it("blocks when the decision is missing (the gate step did not answer)", () => {
      expect(audit(1, "").status).toBe(1);
    });

    it("keeps audit-ci's own exit code through the pipe to the log", () => {
      expect(audit(3, "true").status).toBe(3);
    });

    it("tries an audit that could not reach the registry again, 3 times in all", () => {
      const result = unreachable("false");

      expect(
        result.output.match(
          /::warning::O audit-ci não conseguiu auditar \(código 1; tentativa \d de 3\)/g,
        ),
      ).toHaveLength(2);
    });

    it("blocks a dependency change it could not audit, never calling it an advisory", () => {
      const result = unreachable("true");

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        "::error::O audit-ci não conseguiu auditar depois de 3 tentativas (código 1): o registry não respondeu",
      );
      expect(result.output).not.toContain("audit-ci reprovou");
    });

    it("only warns, with a summary section, when the dependencies did not change", () => {
      const result = unreachable("false");

      expect(result.status, result.output).toBe(0);
      expect(result.output).toContain(
        "::warning::O audit-ci não conseguiu auditar depois de 3 tentativas",
      );
      expect(result.summary).toContain(
        "Audit de dependências: não rodou (não bloqueia)",
      );
    });

    it("is wired to the gate step and runs on every event", () => {
      const ci = readWorkflow("ci.yml");

      expect(ci).toContain(
        "BASE_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}",
      );
      expect(ci).toContain("run: node .github/scripts/dependency-gate.mjs");
      expect(ci).toContain("BLOCKING: ${{ steps.deps.outputs.blocking }}");
      expect(
        ci.indexOf("- name: Did this change touch the dependencies?"),
      ).toBeLessThan(ci.indexOf("- name: Audit production dependencies"));
    });
  },
);
