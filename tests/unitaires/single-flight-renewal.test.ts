import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createSingleFlight } from "@/lib/single-flight";

/**
 * The middleware's session renewal, shared by the requests racing it.
 *
 * A page whose access token just expired fires several requests at once, and
 * each one POSTed /user/refresh-token with the same refresh token. The API
 * mints a sibling for a few late presentations and reads the next one as a
 * stolen token, which ends the session on every device.
 */
type Renewal =
  | { kind: "renewed"; token: string }
  | { kind: "refused" }
  | { kind: "unavailable" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

function flight(clock = { at: 0 }) {
  return createSingleFlight<Renewal>({
    keepMs: 10_000,
    maxEntries: 3,
    keep: (renewal) => renewal.kind !== "unavailable",
    now: () => clock.at,
  });
}

describe("createSingleFlight", () => {
  it("runs one renewal for the requests racing on one refresh token", async () => {
    const run = flight();
    const answer = deferred<Renewal>();
    const task = vi.fn(() => answer.promise);

    const racing = [run("rt-1", task), run("rt-1", task), run("rt-1", task)];

    answer.resolve({ kind: "renewed", token: "new" });

    const results = await Promise.all(racing);

    expect(task).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.kind === "renewed")).toBe(true);
  });

  it("hands the settled answer to a request arriving right after", async () => {
    const clock = { at: 0 };
    const run = flight(clock);
    const task = vi.fn(async (): Promise<Renewal> => ({
      kind: "renewed",
      token: "new",
    }));

    await run("rt-1", task);
    clock.at = 9_000;
    await run("rt-1", task);

    expect(task).toHaveBeenCalledTimes(1);

    clock.at = 20_001;
    await run("rt-1", task);

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("does not keep an unavailable answer: the next request tries again", async () => {
    const run = flight();
    const task = vi
      .fn<[], Promise<Renewal>>()
      .mockResolvedValueOnce({ kind: "unavailable" })
      .mockResolvedValueOnce({ kind: "renewed", token: "new" });

    expect((await run("rt-1", task)).kind).toBe("unavailable");
    await Promise.resolve();
    expect((await run("rt-1", task)).kind).toBe("renewed");
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("keeps sessions apart", async () => {
    const run = flight();
    const task = vi.fn(async (): Promise<Renewal> => ({ kind: "refused" }));

    await Promise.all([run("rt-1", task), run("rt-2", task)]);

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("drops the oldest entry past the limit", async () => {
    const run = flight();
    const task = vi.fn(async (): Promise<Renewal> => ({ kind: "refused" }));

    for (const key of ["a", "b", "c", "d"]) await run(key, task);
    await run("a", task);

    expect(task).toHaveBeenCalledTimes(5);
  });
});

describe("the middleware", () => {
  it("renews through the shared flight, never with a bare POST per request", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/middleware.ts"),
      "utf8",
    );

    expect(source).toContain("createSingleFlight<SessionRenewal>");
    expect(source).toMatch(/renewSessionOnce\(refreshToken!,/);
    expect(source.match(/await renewSession\(/g) ?? []).toHaveLength(0);
  });
});
