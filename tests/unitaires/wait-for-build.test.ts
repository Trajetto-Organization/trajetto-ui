// @vitest-environment node
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

/**
 * The rollout check (wait-for-build.mjs): only an ANSWER moves the
 * stability window (decision D10, 30/10/2026).
 *
 * The script waits until /build-id.json has answered the promoted commit for
 * longer than Swarm's rollback monitor. A probe with no answer (a 5xx or
 * 52x of the edge, a timeout, a challenge page instead of the JSON) used to
 * reset the window as if Swarm had rolled back, and a flaky edge could run
 * the whole timeout down with the right build serving. Now only a build id
 * that is not the expected one (or a build with none) resets it; failed
 * probes count neither way, and are reported in a warning and the summary.
 * The window still closes only on an answer of the expected commit.
 *
 * trajetto-api's compose-rollout-verify.test.ts runs this script too.
 */
const SCRIPT = resolve(
  process.cwd(),
  ".github",
  "scripts",
  "wait-for-build.mjs",
);
const PROMOTED = "0a1b2c3d4e5f60718293a4b5c6d7e8f901234567";
const RUNNING = "fedcba9876543210fedcba9876543210fedcba98";

type Answer =
  { sha: string } | { status: number } | { noSha: true } | { html: true };

let server: Server | undefined;
let folder: string | undefined;

afterEach(async () => {
  await new Promise<void>((done) =>
    server ? server.close(() => done()) : done(),
  );
  server = undefined;
  if (folder) rmSync(folder, { recursive: true, force: true });
  folder = undefined;
});

/** A site that answers `answers` in turn, the last one repeating. */
async function fakeSite(answers: Answer[]) {
  let count = 0;

  server = createServer((_request, response) => {
    const answer = answers[Math.min(count, answers.length - 1)];

    count += 1;

    if ("status" in answer) {
      response.statusCode = answer.status;
      response.end("bad gateway");
    } else if ("html" in answer) {
      response.setHeader("content-type", "text/html");
      response.end("<html>Just a moment...</html>");
    } else {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify("noSha" in answer ? {} : { sha: answer.sha }),
      );
    }
  });

  await new Promise<void>((done) =>
    server!.listen(0, "127.0.0.1", () => done()),
  );

  return {
    url: `http://127.0.0.1:${(server!.address() as AddressInfo).port}`,
    requests: () => count,
  };
}

function waitForBuild(env: Record<string, string>) {
  folder = mkdtempSync(join(tmpdir(), "trajetto-ui-wait-"));

  const summary = join(folder, "summary");

  writeFileSync(summary, "");

  return new Promise<{
    status: number | null;
    output: string;
    summary: string;
  }>((done) => {
    const child = spawn(process.execPath, [SCRIPT], {
      env: {
        PATH: process.env.PATH ?? "",
        ...(process.env.SystemRoot
          ? { SystemRoot: process.env.SystemRoot }
          : {}),
        GITHUB_STEP_SUMMARY: summary,
        WAIT_POLL_SECONDS: "0.01",
        WAIT_TIMEOUT_SECONDS: "10",
        WAIT_STABLE_SECONDS: "0.15",
        ...env,
      } as unknown as NodeJS.ProcessEnv,
    });

    let output = "";

    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (status) =>
      done({ status, output, summary: readFileSync(summary, "utf8") }),
    );
  });
}

const errors = (count: number, answer: Answer = { status: 502 }) =>
  Array.from({ length: count }, () => answer);

// Every case starts processes (git, bash, node) and waits for them to
// exit. Vitest's 5 s default is a deadline for that exit, and with the whole
// unit suite saturating the cores process start-up alone can take seconds.
// The deadline is generous; the waits inside the scripts stay the fast ones
// the env sets (the same reasoning as trajetto-api's dokploy-deploy.test.ts).
describe("wait-for-build.mjs", { timeout: 30_000 }, () => {
  it("keeps the window through probes with no answer, and reports them", async () => {
    // One answer of the promoted commit, a long stretch of edge errors, one
    // more answer, and then the old build: only a window that the errors did
    // not reset can have closed by the second answer.
    const site = await fakeSite([
      { sha: PROMOTED },
      ...errors(15),
      ...errors(15, { html: true }),
      { sha: PROMOTED },
      { sha: RUNNING },
    ]);

    const result = await waitForBuild({
      SITE_URL: site.url,
      EXPECTED_SHA: PROMOTED,
    });

    expect(result.status, result.output).toBe(0);
    expect(result.output).toMatch(
      /::warning::30 de 32 consultas ao .* ficaram sem resposta/,
    );
    expect(result.summary).toContain(
      "30 de 32 consultas ao /build-id.json sem resposta",
    );
    expect(result.summary).toContain(`serve ${PROMOTED}`);
  });

  it("restarts the window on an answer from another build", async () => {
    const site = await fakeSite([
      { sha: PROMOTED },
      { sha: RUNNING },
      { sha: PROMOTED },
    ]);

    const result = await waitForBuild({
      SITE_URL: site.url,
      EXPECTED_SHA: PROMOTED,
    });

    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain(`voltou a responder sha ${RUNNING}`);
  });

  it("takes a build with no id for an answer from another build", async () => {
    const site = await fakeSite([
      { sha: PROMOTED },
      { noSha: true },
      { sha: PROMOTED },
    ]);

    const result = await waitForBuild({
      SITE_URL: site.url,
      EXPECTED_SHA: PROMOTED,
    });

    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain("voltou a responder sem sha");
  });

  it("never passes on errors alone", async () => {
    const site = await fakeSite([{ sha: PROMOTED }, { status: 503 }]);

    const result = await waitForBuild({
      SITE_URL: site.url,
      EXPECTED_SHA: PROMOTED,
      WAIT_TIMEOUT_SECONDS: "0.6",
    });

    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(
      new RegExp(
        `::error::O site serviu ${PROMOTED} por 0s e depois só deu consultas sem resposta até o fim de 0\\.6s \\(última: HTTP 503\\)`,
      ),
    );
    expect(site.requests()).toBeGreaterThan(5);
  });

  it("still fails when the old build keeps answering", async () => {
    const site = await fakeSite([{ status: 502 }, { sha: RUNNING }]);

    const result = await waitForBuild({
      SITE_URL: site.url,
      EXPECTED_SHA: PROMOTED,
      WAIT_TIMEOUT_SECONDS: "0.3",
    });

    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(
      new RegExp(
        `não serve ${PROMOTED} após 0\\.3s \\(responde: sha ${RUNNING}\\)`,
      ),
    );
  });
});
