// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  hasBash,
  readWorkflow,
  runBlock,
  sandbox,
  type Sandbox,
} from "./helpers/workflow-shell";

/**
 * Which branch of trajetto-api the CI checks out next to this repository
 * (decision D8, 30/10/2026).
 *
 * `git ls-remote --exit-code` answers 2 when the repository has no such
 * branch and 128 when git could not ask at all (network, credentials). The
 * step read both as "no branch" and silently tested the web against the
 * API's default branch. Now only 2 falls back (with a notice), and to the
 * API's staging, where work branches come from: main can be behind it.
 * Anything else is asked again, up to 4 times with doubling pauses, each a
 * warning, and then fails saying it was not a missing branch.
 *
 * The step's own shell runs here, with `git` stubbed:
 * STUB_ANSWERS lists the exit codes of successive calls (the last repeats).
 * trajetto-api's compose-ci-siblings.test.ts runs the same blocks.
 */
const WORKFLOWS = ["ci.yml", "browser-suites.yml"] as const;
const BRANCH = "feat/entregas-chat-e-hardening-2026-09";
const TOKEN = "read-token-never-printed";

const GIT = `
count_file="$(dirname "$0")/git-count"
count=$(cat "$count_file" 2>/dev/null || echo 0)
count=$((count + 1))
echo "$count" > "$count_file"
set -- $STUB_ANSWERS
index=$count
[ "$index" -gt "$#" ] && index=$#
eval "code=\\\${$index}"
[ "$code" = 128 ] && echo "fatal: unable to access 'https://github.com/': Could not resolve host" >&2
exit "$code"`;

// Every case starts processes (git, bash, node) and waits for them to
// exit. Vitest's 5 s default is a deadline for that exit, and with the whole
// unit suite saturating the cores process start-up alone can take seconds.
// The deadline is generous; the waits inside the scripts stay the fast ones
// the env sets (the same reasoning as trajetto-api's dokploy-deploy.test.ts).
describe.skipIf(!hasBash())(
  "the sibling branch probe (D8)",
  { timeout: 30_000 },
  () => {
    let box: Sandbox;

    beforeEach(() => {
      box = sandbox();
      box.stub("git", GIT);
    });

    afterEach(() => box.dispose());

    function probe(workflow: string, answers: number[]) {
      const script = runBlock(
        readWorkflow(workflow),
        "Pick the sibling branches",
      );

      expect(script, `${workflow}: passo Pick the sibling branches`).not.toBe(
        "",
      );

      return box.run(script, {
        env: {
          TOKEN,
          BRANCH,
          STUB_ANSWERS: answers.join(" "),
          PROBE_RETRY_SECONDS: "0",
        },
      });
    }

    it.each(WORKFLOWS)(
      "%s: takes the same branch when the API has it",
      (workflow) => {
        const result = probe(workflow, [0]);

        expect(result.status, result.output).toBe(0);
        expect(result.outputs.api).toBe(BRANCH);
        expect(box.calls("git")).toHaveLength(1);
      },
    );

    it.each(WORKFLOWS)(
      "%s: falls back to the API's staging only when the API answers it has none",
      (workflow) => {
        const result = probe(workflow, [2]);

        expect(result.status, result.output).toBe(0);
        expect(result.outputs.api).toBe("staging");
        expect(result.output).toContain(
          "::notice::trajetto-api não tem a branch",
        );
        expect(box.calls("git")).toHaveLength(1);
      },
    );

    it.each(WORKFLOWS)(
      "%s: asks again after a network error, with a warning per retry",
      (workflow) => {
        const result = probe(workflow, [128, 128, 0]);

        expect(result.status, result.output).toBe(0);
        expect(result.outputs.api).toBe(BRANCH);
        expect(box.calls("git")).toHaveLength(3);
        expect(result.output.match(/::warning::git ls-remote/g)).toHaveLength(
          2,
        );
        expect(result.output).toContain("tentativa 1 de 4");
      },
    );

    it.each(WORKFLOWS)(
      "%s: fails, never falls back, when git keeps failing to ask",
      (workflow) => {
        const result = probe(workflow, [128]);

        expect(result.status).not.toBe(0);
        expect(result.outputs.api).toBeUndefined();
        expect(box.calls("git")).toHaveLength(4);
        expect(result.output).toMatch(
          /::error::git ls-remote não conseguiu consultar trajetto-api \(código 128\) em 4 tentativas/,
        );
        expect(result.output).not.toContain("::notice::");
      },
    );

    it.each(WORKFLOWS)("%s: never prints the token", (workflow) => {
      const result = probe(workflow, [128]);
      const encoded = Buffer.from(`x-access-token:${TOKEN}`).toString("base64");

      expect(result.output).not.toContain(TOKEN);
      expect(result.output).not.toContain(encoded);
      expect(
        box
          .calls("git")
          .every((call) => call.includes(`AUTHORIZATION: basic ${encoded}`)),
      ).toBe(true);
    });

    it("is the same block in both workflows", () => {
      expect(
        runBlock(readWorkflow("ci.yml"), "Pick the sibling branches"),
      ).toBe(
        runBlock(
          readWorkflow("browser-suites.yml"),
          "Pick the sibling branches",
        ),
      );
    });
  },
);
