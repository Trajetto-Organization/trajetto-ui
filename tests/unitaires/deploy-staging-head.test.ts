// @vitest-environment node
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  hasBash,
  readWorkflow,
  realCommand,
  runBlock,
  sandbox,
  type Sandbox,
} from "./helpers/workflow-shell";

/**
 * deploy-staging's "Is this run still staging's head?", run for real against
 * git repositories on disk (an origin and a shallow checkout of it, as
 * actions/checkout leaves).
 *
 * - The head was `git ls-remote | cut -f1` without pipefail: an error left
 *   it empty, the deploy was skipped, green, and no `staged-<7>` marker was
 *   written (decision D5). Now an empty or malformed answer is asked again,
 *   up to 4 times, and then fails.
 * - A run whose commit is no longer the head stays out of staging (an older
 *   push must not move staging back), unless the newer head only adds
 *   documentation: a `[skip ci]` commit runs no pipeline, so this run is the
 *   only one that can deploy (decision D11).
 */
const STEP = runBlock(
  readWorkflow("deploy.yml"),
  "Is this run still staging's head?",
);

// Every case starts processes (git, bash, node) and waits for them to
// exit. Vitest's 5 s default is a deadline for that exit, and with the whole
// unit suite saturating the cores process start-up alone can take seconds.
// The deadline is generous; the waits inside the scripts stay the fast ones
// the env sets (the same reasoning as trajetto-api's dokploy-deploy.test.ts).
describe.skipIf(!hasBash())(
  "deploy-staging: is this run still staging's head?",
  { timeout: 30_000 },
  () => {
    let box: Sandbox;
    let env: Record<string, string>;
    let origin: string;
    let work: string;
    let checkout: string;

    const git = (cwd: string, ...args: string[]) =>
      execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        env: env as unknown as NodeJS.ProcessEnv,
      }).trim();

    function commit(files: Record<string, string>, message: string): string {
      for (const [path, content] of Object.entries(files)) {
        box.file(`work/${path}`, content);
      }

      git(work, "add", "-A");
      git(work, "commit", "-q", "-m", message);
      git(work, "push", "-q", "--force", "origin", "HEAD:staging");

      return git(work, "rev-parse", "HEAD");
    }

    beforeEach(() => {
      box = sandbox();
      env = {
        ...(process.env as Record<string, string>),
        // The developer's own git configuration stays out of the fixture.
        GIT_CONFIG_GLOBAL: box.file("gitconfig", ""),
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_AUTHOR_NAME: "CI",
        GIT_AUTHOR_EMAIL: "ci@example.com",
        GIT_COMMITTER_NAME: "CI",
        GIT_COMMITTER_EMAIL: "ci@example.com",
        GIT_TERMINAL_PROMPT: "0",
      };

      origin = pathToFileURL(`${box.root}/origin.git`).href;
      work = `${box.root}/work`;
      checkout = `${box.root}/checkout`;

      git(box.root, "init", "-q", "--bare", "-b", "staging", "origin.git");
      mkdirSync(work, { recursive: true });
      git(work, "init", "-q", "-b", "staging");
      git(work, "remote", "add", "origin", origin);

      // The script the step calls, at the path the sparse checkout gives it.
      mkdirSync(`${work}/.github/scripts`, { recursive: true });
      copyFileSync(
        resolve(process.cwd(), ".github", "scripts", "docs-only.mjs"),
        `${work}/.github/scripts/docs-only.mjs`,
      );
    });

    afterEach(() => box.dispose());

    /** A shallow checkout of `sha`, as actions/checkout leaves it. */
    function checkOut(sha: string) {
      git(
        box.root,
        "clone",
        "-q",
        "--depth",
        "1",
        "--no-single-branch",
        origin,
        "checkout",
      );
      git(checkout, "fetch", "-q", "--depth", "1", "origin", sha);
      git(checkout, "checkout", "-q", sha);
    }

    function run(sha: string, extra: Record<string, string> = {}) {
      return box.run(STEP, {
        cwd: checkout,
        env: {
          ...env,
          GITHUB_REF: "refs/heads/staging",
          GITHUB_SHA: sha,
          HEAD_RETRY_SECONDS: "0",
          ...extra,
        },
      });
    }

    it("deploys when this run's commit is the head", () => {
      const built = commit({ "src/app.ts": "export const a = 1;\n" }, "code");

      checkOut(built);

      const result = run(built);

      expect(result.status, result.output).toBe(0);
      expect(result.outputs.current).toBe("true");
    });

    it("still deploys when the newer head only adds documentation", () => {
      const built = commit({ "src/app.ts": "export const a = 1;\n" }, "code");

      checkOut(built);
      commit(
        { "docs/deploy.md": "# doc\n", "README.md": "# leia\n" },
        "docs [skip ci]",
      );

      const result = run(built);

      expect(result.status, result.output).toBe(0);
      expect(result.outputs.current).toBe("true");
      expect(result.output).toContain(
        "só acrescenta documentação a este build",
      );
    });

    it("leaves staging to the newer run when the head changes code", () => {
      const built = commit({ "src/app.ts": "export const a = 1;\n" }, "code");

      checkOut(built);
      commit({ "docs/deploy.md": "# doc\n" }, "docs");
      commit({ "src/app.ts": "export const a = 2;\n" }, "more code");

      const result = run(built);

      expect(result.status, result.output).toBe(0);
      expect(result.outputs.current).toBe("false");
      expect(result.output).toContain("o run do commit mais novo faz o deploy");
    });

    it("does not take a renamed source file for documentation", () => {
      const built = commit({ "src/notes.ts": "export const n = 1;\n" }, "code");

      checkOut(built);
      mkdirSync(`${work}/docs`, { recursive: true });
      git(work, "mv", "src/notes.ts", "docs/notes.md");
      git(work, "commit", "-q", "-m", "move");
      git(work, "push", "-q", "origin", "HEAD:staging");

      const result = run(built);

      expect(result.status, result.output).toBe(0);
      expect(result.outputs.current).toBe("false");
    });

    it("leaves staging alone when the head is not a descendant of this commit", () => {
      const built = commit({ "src/app.ts": "export const a = 1;\n" }, "code");

      checkOut(built);
      // A rewritten staging: same tree plus a doc, but not built on this run.
      git(work, "checkout", "-q", "--orphan", "rewritten");
      box.file("work/docs/x.md", "# x\n");
      git(work, "add", "-A");
      git(work, "commit", "-q", "-m", "rewritten");
      git(work, "push", "-q", "--force", "origin", "HEAD:staging");

      const result = run(built);

      expect(result.status, result.output).toBe(0);
      expect(result.outputs.current).toBe("false");
    });

    describe("reading the head", () => {
      const realGit = realCommand("git");

      /** git that fails its first STUB_FAILURES `ls-remote` calls. */
      const FLAKY_GIT = `
if [ "$1" = ls-remote ]; then
  count_file="$(dirname "$0")/ls-remote-count"
  count=$(( $(cat "$count_file" 2>/dev/null || echo 0) + 1 ))
  echo "$count" > "$count_file"
  if [ "$count" -le "\${STUB_FAILURES:-0}" ]; then
    echo "fatal: unable to access 'https://github.com/': Connection reset by peer" >&2
    exit 128
  fi
fi
exec "${realGit}" "$@"`;

      it("asks again after a failure, with a warning per retry", () => {
        const built = commit({ "src/app.ts": "export const a = 1;\n" }, "code");

        checkOut(built);
        box.stub("git", FLAKY_GIT);

        const result = run(built, { STUB_FAILURES: "2" });

        expect(result.status, result.output).toBe(0);
        expect(result.outputs.current).toBe("true");
        expect(
          result.output.match(/::warning::git ls-remote não devolveu o HEAD/g),
        ).toHaveLength(2);
      });

      it("fails, instead of skipping the deploy green, when it cannot read the head", () => {
        const built = commit({ "src/app.ts": "export const a = 1;\n" }, "code");

        checkOut(built);
        box.stub("git", FLAKY_GIT);

        const result = run(built, { STUB_FAILURES: "99" });

        expect(result.status).not.toBe(0);
        expect(result.outputs.current).toBeUndefined();
        expect(result.output).toMatch(
          /::error::Não foi possível ler o HEAD de refs\/heads\/staging .* em 4 tentativas/,
        );
        expect(
          box.calls("git").filter((call) => call.startsWith("git ls-remote")),
        ).toHaveLength(4);
      });

      it("takes an empty answer (no such ref) for a failure, not for 'staging moved on'", () => {
        const built = commit({ "src/app.ts": "export const a = 1;\n" }, "code");

        checkOut(built);

        const result = run(built, { GITHUB_REF: "refs/heads/gone" });

        expect(result.status).not.toBe(0);
        expect(result.outputs.current).toBeUndefined();
        expect(result.output).toContain(
          "::error::Não foi possível ler o HEAD de refs/heads/gone",
        );
      });
    });
  },
);
