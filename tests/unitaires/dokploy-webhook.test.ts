// @vitest-environment node
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

/**
 * The deploy step of both environments: a POST to the Dokploy Application's
 * deploy webhook (.github/scripts/dokploy-webhook.mjs).
 *
 * Dokploy does not exist yet, so a missing webhook must skip the deploy and
 * say so, not fail the pipeline that already pushed the image. And the
 * webhook URL carries the Application's token: it is never printed. The
 * script runs for real here, against a fake Dokploy on the loopback.
 */
const SCRIPT = resolve(
  process.cwd(),
  ".github",
  "scripts",
  "dokploy-webhook.mjs",
);
const TOKEN = "webhook-token-that-must-never-be-printed";

let server: Server | undefined;
const scratches: string[] = [];

afterEach(async () => {
  await new Promise<void>((done) =>
    server ? server.close(() => done()) : done(),
  );
  server = undefined;

  for (const dir of scratches.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

interface Call {
  method: string;
  path: string;
  body: string;
}

/** A Dokploy answering `statuses` in turn (the last one repeats). */
async function fakeDokploy(
  statuses: number[],
): Promise<{ url: string; calls: Call[] }> {
  const calls: Call[] = [];

  server = createServer((request: IncomingMessage, response) => {
    let body = "";

    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      calls.push({
        method: request.method ?? "",
        path: request.url ?? "",
        body,
      });

      const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];

      response.writeHead(status, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          message: status < 300 ? "Deployment queued" : "Refused",
        }),
      );
    });
  });

  await new Promise<void>((done) => server!.listen(0, "127.0.0.1", done));

  const { port } = server!.address() as AddressInfo;

  return { url: `http://127.0.0.1:${port}/api/deploy/${TOKEN}`, calls };
}

interface Run {
  code: number | null;
  output: string;
  githubOutput: string;
  summary: string;
}

async function run(env: Record<string, string>): Promise<Run> {
  const scratch = mkdtempSync(join(tmpdir(), "dokploy-webhook-"));

  scratches.push(scratch);

  const githubOutput = join(scratch, "output");
  const summary = join(scratch, "summary");

  writeFileSync(githubOutput, "");
  writeFileSync(summary, "");

  const child = spawn(process.execPath, [SCRIPT], {
    env: {
      NODE_ENV: "test",
      PATH: process.env.PATH ?? "",
      GITHUB_OUTPUT: githubOutput,
      GITHUB_STEP_SUMMARY: summary,
      WEBHOOK_RETRY_SECONDS: "0.01",
      WEBHOOK_SECRET_NAME: "DOKPLOY_STAGING_WEBHOOK_URL",
      ...env,
    },
  });

  let output = "";

  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));

  const code = await new Promise<number | null>((done) =>
    child.on("close", done),
  );

  return {
    code,
    output,
    githubOutput: readFileSync(githubOutput, "utf8"),
    summary: readFileSync(summary, "utf8"),
  };
}

describe("dokploy-webhook.mjs", () => {
  it("skips with a notice, and succeeds, when the webhook does not exist yet", async () => {
    const result = await run({ WEBHOOK_URL: "" });

    expect(result.code).toBe(0);
    expect(result.output).toContain("::notice::DOKPLOY_STAGING_WEBHOOK_URL");
    expect(result.githubOutput).toContain("deployed=false");
    expect(result.summary).toContain("PULADO");
  });

  it("posts to the webhook and reports the deploy as accepted", async () => {
    const dokploy = await fakeDokploy([200]);
    const result = await run({ WEBHOOK_URL: dokploy.url });

    expect(result.code).toBe(0);
    expect(dokploy.calls).toHaveLength(1);
    expect(dokploy.calls[0].method).toBe("POST");
    expect(dokploy.calls[0].path).toBe(`/api/deploy/${TOKEN}`);
    expect(result.githubOutput).toContain("deployed=true");
  });

  it("retries a server error and then succeeds", async () => {
    const dokploy = await fakeDokploy([502, 200]);
    const result = await run({ WEBHOOK_URL: dokploy.url });

    expect(result.code).toBe(0);
    expect(dokploy.calls).toHaveLength(2);
    expect(result.githubOutput).toContain("deployed=true");
  });

  it("fails at once on a refusal, which a retry would not change", async () => {
    const dokploy = await fakeDokploy([400]);
    const result = await run({ WEBHOOK_URL: dokploy.url });

    expect(result.code).toBe(1);
    expect(dokploy.calls).toHaveLength(1);
    expect(result.output).toContain(
      "::error::O Dokploy recusou o webhook: HTTP 400",
    );
    expect(result.githubOutput).toContain("deployed=false");
  });

  it("fails after the last attempt when Dokploy keeps erroring", async () => {
    const dokploy = await fakeDokploy([503]);
    const result = await run({
      WEBHOOK_URL: dokploy.url,
      WEBHOOK_ATTEMPTS: "3",
    });

    expect(result.code).toBe(1);
    expect(dokploy.calls).toHaveLength(3);
  });

  it("refuses a plain http webhook off the loopback, since the token is in the URL", async () => {
    const result = await run({
      WEBHOOK_URL: `http://dokploy.example.com/api/deploy/${TOKEN}`,
    });

    expect(result.code).toBe(1);
    expect(result.output).toContain("precisa ser https://");
  });

  it("never prints the webhook's token, whatever happens", async () => {
    const dokploy = await fakeDokploy([500]);
    const refused = await run({
      WEBHOOK_URL: dokploy.url,
      WEBHOOK_ATTEMPTS: "1",
    });
    const unreachable = await run({
      WEBHOOK_URL: `http://127.0.0.1:1/api/deploy/${TOKEN}`,
      WEBHOOK_ATTEMPTS: "1",
      WEBHOOK_TIMEOUT_SECONDS: "2",
    });

    for (const result of [refused, unreachable]) {
      expect(result.code).toBe(1);
      expect(result.output).not.toContain(TOKEN);
      expect(result.summary).not.toContain(TOKEN);
    }
  });
});
