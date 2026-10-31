// @vitest-environment node
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkRoutes,
  clientPathShapes,
  missingRoutes,
} from "../../scripts/check-api-routes.mjs";

/**
 * The web promoted ahead of the API it calls.
 *
 * UI and API ship through two separate promote buttons with nothing between
 * them. A web build that calls a route the production API does not serve yet
 * (or no longer serves) answered 404 on that screen until the other side
 * caught up — the fine that could not be deleted was exactly this. The
 * promote job now compares what the build calls with the production API's
 * OpenAPI document before moving `stable`.
 */
describe("clientPathShapes", () => {
  it("reads the API paths the server code builds, one segment per placeholder", () => {
    const shapes = clientPathShapes([
      {
        path: "src/actions/fine/delete-fine/index.ts",
        source:
          "await fetch(`${process.env.HTTP_REQUEST}/fines/delete-fine/${fineId}/business/${businessId}`, {",
      },
      {
        path: "src/socket.ts",
        source:
          "const url = `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/deliveries?page=${page}&x=1`;",
      },
      {
        path: "src/x.ts",
        source: "fetch(`https://viacep.com.br/ws/${cep}/json`)",
      },
    ]);

    expect([...shapes.keys()].sort()).toEqual([
      "/deliveries",
      "/fines/delete-fine/SEG/business/SEG",
    ]);
  });

  // Browser code reads the API URL at run time (decision 12.2); the check
  // must keep seeing the paths it calls, or a route removed from the API
  // would no longer block the promote.
  it("reads the paths browser code builds from the run-time API URL", () => {
    const shapes = clientPathShapes([
      {
        path: "src/hooks/x.ts",
        source:
          "await fetch(`${await publicApiUrl()}/kanban/list/${businessId}?${params.toString()}`)",
      },
    ]);

    expect([...shapes.keys()]).toEqual(["/kanban/list/SEG"]);
  });

  // Since the page holds no token, browser reads go through the same-origin
  // relay; the paths it forwards must still block a promote.
  it("reads the paths browser code sends through the relay", () => {
    const shapes = clientPathShapes([
      {
        path: "src/hooks/y.ts",
        source:
          'fetch(relayUrl(`/kanban/list/${encodeURIComponent(id)}`, params)); fetch(relayUrl("/user/me"));',
      },
    ]);

    expect([...shapes.keys()].sort()).toEqual(["/kanban/list/SEG", "/user/me"]);
  });

  // The first production promote of the web (29/10/2026) stopped on three
  // "paths" the API does not serve: `/literal/path`, `/path` and `/…`, the
  // examples the doc comments of relay-read.ts, env/client.ts and
  // export-requests.ts give of the shape this gate reads. A comment is not a
  // call, so it must not block a promote.
  it("does not read the paths a comment gives as examples", () => {
    const shapes = clientPathShapes([
      {
        path: "src/lib/z.ts",
        source: [
          "/**",
          ' * Call sites pass `relayUrl("/literal/path", query)`, and keep',
          " * `${await publicApiUrl()}/path` as written.",
          " */",
          '// relayUrl("/from/a/line/comment")',
          '  /* relayUrl("/from/a/one-line/block") */',
          'fetch(relayUrl("/user/me"));',
        ].join("\n"),
      },
    ]);

    expect([...shapes.entries()]).toEqual([["/user/me", "src/lib/z.ts:7"]]);
  });

  it("takes no comment of this repository's source for a call", () => {
    const sources = [
      "src/lib/relay-read.ts",
      "src/env/client.ts",
      "src/lib/export-requests.ts",
    ].map((path) => ({
      path,
      source: readFileSync(resolve(process.cwd(), path), "utf8"),
    }));
    const shapes = [...clientPathShapes(sources).keys()];

    expect(shapes).not.toContain("/literal/path");
    expect(shapes).not.toContain("/path");
    expect(shapes).not.toContain("/…");
    // The real calls of export-requests.ts are still read.
    expect(shapes.length).toBeGreaterThan(0);
  });

  it("finds every browser call in this repository's source", () => {
    const sources = [
      "src/app/(protected)/_components/kanban/board-provider/hooks/kanban-infinite-scroll.ts",
      "src/app/(protected)/_components/layout/hooks/navigation-security-check.ts",
      "src/lib/notification-stream.ts",
    ].map((path) => ({
      path,
      source: readFileSync(resolve(process.cwd(), path), "utf8"),
    }));

    expect([...clientPathShapes(sources).keys()].sort()).toEqual([
      "/kanban/list/SEG",
      "/notification/stream",
      "/user/me",
    ]);
  });
});

describe("missingRoutes", () => {
  const calls = new Map([
    [
      "/fines/delete-fine/SEG/business/SEG",
      "src/actions/fine/delete-fine/index.ts:12",
    ],
    ["/deliveries", "src/actions/delivery/index.ts:3"],
  ]);

  it("reports a path the API does not document", () => {
    const docs = {
      paths: { "/deliveries": {}, "/fines/delete-fine/{fineId}": {} },
    };

    expect(missingRoutes(calls, docs)).toEqual([
      "/fines/delete-fine/SEG/business/SEG  (src/actions/fine/delete-fine/index.ts:12)",
    ]);
  });

  it("reports nothing when every path has a route", () => {
    const docs = {
      paths: {
        "/deliveries/": {},
        "/fines/delete-fine/{fineId}/business/{businessId}": {},
      },
    };

    expect(missingRoutes(calls, docs)).toEqual([]);
  });

  it("refuses a document with no paths rather than passing everything", () => {
    expect(() => missingRoutes(calls, { paths: {} })).toThrow();
    expect(() => missingRoutes(calls, {})).toThrow();
  });
});

/**
 * One read was the verdict (decision D10, 30/10/2026): a 5xx in the middle
 * of the API's rollout, or an old replica that still lacks the new routes,
 * stopped the promote with "promote the API and run it again". Now the
 * document is read again until a deadline; only what is still true at the
 * deadline fails.
 */
describe("checkRoutes", () => {
  const shapes = new Map([
    ["/deliveries", "src/a.ts:1"],
    ["/fines/SEG", "src/b.ts:2"],
  ]);
  const OLD = { paths: { "/deliveries": {} } };
  const NEW = { paths: { "/deliveries": {}, "/fines/{id}": {} } };

  function run(
    reads: Array<{ kind: string; document?: unknown; reason?: string }>,
    waitMs = 600_000,
  ) {
    let clock = 0;
    let count = 0;
    const lines: string[] = [];

    return {
      lines,
      reads: () => count,
      result: checkRoutes(shapes, {
        read: async () => reads[Math.min(count++, reads.length - 1)],
        sleep: async (ms: number) => {
          clock += ms;
        },
        now: () => clock,
        log: (line: string) => lines.push(line),
        waitMs,
        pollMs: 30_000,
      }),
    };
  }

  it("passes on the first read when everything is served", async () => {
    const check = run([{ kind: "document", document: NEW }]);

    expect(await check.result).toMatchObject({ code: 0, reads: 1 });
  });

  it("reads again while an old replica answers, and passes once the routes are there", async () => {
    const check = run([
      { kind: "document", document: OLD },
      { kind: "transient", reason: "the API document answered 502" },
      { kind: "document", document: OLD },
      { kind: "document", document: NEW },
    ]);

    expect(await check.result).toMatchObject({ code: 0, reads: 4 });
    expect(check.lines[0]).toMatch(
      /read 1: 1 path\(s\) not served yet; reading again in 30s/,
    );
    expect(check.lines[1]).toMatch(/read 2: the API document answered 502/);
  });

  it("fails at the deadline with the routes still missing (an API never promoted)", async () => {
    const check = run([{ kind: "document", document: OLD }], 120_000);
    const result = await check.result;

    expect(result).toMatchObject({ code: 1 });
    expect(result.missing).toEqual(["/fines/SEG  (src/b.ts:2)"]);
    expect(check.reads()).toBe(5);
  });

  it("fails at the deadline with the last transport error (exit 2)", async () => {
    const check = run([{ kind: "transient", reason: "fetch failed" }], 60_000);

    expect(await check.result).toMatchObject({
      code: 2,
      reason: "fetch failed",
      reads: 3,
    });
  });

  it("fails a refused read at once: a retry does not fix credentials", async () => {
    const check = run([
      { kind: "refused", reason: "the API document answered 401" },
    ]);

    expect(await check.result).toMatchObject({ code: 2, reads: 1 });
  });

  it("reads again a document with no paths (an API mid-boot)", async () => {
    const check = run([
      { kind: "document", document: { paths: {} } },
      { kind: "document", document: NEW },
    ]);

    expect(await check.result).toMatchObject({ code: 0, reads: 2 });
  });
});

// Every case starts processes (git, bash, node) and waits for them to
// exit. Vitest's 5 s default is a deadline for that exit, and with the whole
// unit suite saturating the cores process start-up alone can take seconds.
// The deadline is generous; the waits inside the scripts stay the fast ones
// the env sets (the same reasoning as trajetto-api's dokploy-deploy.test.ts).
describe("the CLI, against a local API document", { timeout: 30_000 }, () => {
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

  /** A /docs/json that answers `answers` in turn (the last repeats). */
  async function api(answers: Array<{ status: number; body?: unknown }>) {
    let count = 0;

    server = createServer((request, response) => {
      const answer = answers[Math.min(count++, answers.length - 1)];

      response.statusCode = answer.status;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(answer.body ?? { message: "no" }));
    });

    await new Promise<void>((done) =>
      server!.listen(0, "127.0.0.1", () => done()),
    );

    return `http://127.0.0.1:${(server!.address() as AddressInfo).port}/docs/json`;
  }

  function check(url: string, wait = "5") {
    folder = mkdtempSync(join(tmpdir(), "trajetto-ui-routes-"));
    writeFileSync(join(folder, "a.ts"), 'fetch(relayUrl("/user/me"));\n');

    return new Promise<{ status: number | null; output: string }>((done) => {
      const child = spawn(
        process.execPath,
        [resolve(process.cwd(), "scripts", "check-api-routes.mjs"), folder!],
        {
          env: {
            PATH: process.env.PATH ?? "",
            ...(process.env.SystemRoot
              ? { SystemRoot: process.env.SystemRoot }
              : {}),
            API_DOCS_URL: url,
            ROUTES_WAIT_SECONDS: wait,
            ROUTES_POLL_SECONDS: "0.02",
          } as unknown as NodeJS.ProcessEnv,
        },
      );
      let output = "";

      child.stdout.on("data", (chunk) => (output += chunk));
      child.stderr.on("data", (chunk) => (output += chunk));
      child.on("close", (status) => done({ status, output }));
    });
  }

  it("rides out a 502 and an old replica, then passes", async () => {
    const url = await api([
      { status: 502 },
      { status: 200, body: { paths: { "/health": {} } } },
      { status: 200, body: { paths: { "/user/me": {} } } },
    ]);
    const result = await check(url);

    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain(
      "::warning::The API document was read 3 times",
    );
    expect(result.output).toContain(
      "All 1 API paths this build calls are served.",
    );
  });

  it("fails at once on a refused read (exit 2)", async () => {
    const result = await check(await api([{ status: 401 }]));

    expect(result.status).toBe(2);
    expect(result.output).toContain("the API document answered 401.");
  });

  it("fails at the deadline, listing what is still missing (exit 1)", async () => {
    const result = await check(
      await api([{ status: 200, body: { paths: { "/health": {} } } }]),
      "0.2",
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain(
      "does not serve 1 path(s) this build calls (still after 0.2s)",
    );
    expect(result.output).toContain("/user/me");
  });
});

describe("the promote job", () => {
  it("checks the API before it moves `stable`", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github", "workflows", "deploy.yml"),
      "utf8",
    );

    const check = workflow.indexOf("node scripts/check-api-routes.mjs");
    const promote = workflow.indexOf("- name: Promote image to stable");

    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(promote);
    expect(workflow.slice(0, check)).toContain("promote-production:");
  });
});
