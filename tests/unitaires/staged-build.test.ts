// @vitest-environment node
import { describe, expect, it } from "vitest";

import { resolveStagedBuild } from "../../.github/scripts/staged-build.mjs";

/**
 * Which staging build a merge into main promotes (decisions D10 and D11,
 * 30/10/2026).
 *
 * The promote ships the build staging served (its `staged-<7>` marker). It
 * used to stop, asking for a re-run, in two situations that are not
 * defects:
 *
 *   - the merge came before staging finished with that commit: a staging
 *     run still going is now waited for;
 *   - the commit never ran in staging (`[skip ci]`): its nearest staged
 *     ancestor is promoted when everything in between is documentation,
 *     which the image never contains.
 *
 * Everything else is still refused: code that staging never ran, a staging
 * run that finished without serving the build.
 */
/** A commit sha whose short form is the digit seven times: 3 → 3333333. */
const sha = (n: number) => String(n).repeat(40);
const DIGEST = (n: number) => `sha256:${n.toString(16).padStart(64, "0")}`;

interface World {
  /** First-parent history from the merged commit, newest first. */
  history: string[];
  /** Commits with a staged marker, and its digest. */
  staged?: Record<string, string>;
  /** A staging run of a commit: its successive reads (the last repeats). */
  runs?: Record<string, Array<{ status: string; conclusion: string | null }>>;
  /** Files between two commits, keyed `from..to`. */
  diffs?: Record<string, string[]>;
  /** Markers that appear once a run of that commit has completed. */
  stagedWhenDone?: Record<string, string>;
  waitMs?: number;
}

function deps(world: World) {
  const reads: Record<string, number> = {};
  const lines: string[] = [];
  let clock = 0;

  const runOf = (commit: string) => {
    const walk = world.runs?.[commit];

    if (!walk) return null;

    reads[commit] = (reads[commit] ?? 0) + 1;

    const step = walk[Math.min(reads[commit], walk.length) - 1];

    return { ...step, url: `https://github.com/runs/${commit.slice(-3)}` };
  };

  return {
    lines,
    reads,
    deps: {
      firstParents: (source: string, max: number) => {
        const from = world.history.indexOf(source);

        return world.history.slice(from, from + max);
      },
      changedFiles: (from: string, to: string) => {
        const files = world.diffs?.[`${from}..${to}`];

        if (!files) throw new Error(`no diff ${from}..${to} in the fixture`);

        return files;
      },
      stagedDigest: async (commit: string) => {
        if (world.staged?.[commit]) return world.staged[commit];

        const run = world.runs?.[commit];
        const done =
          run &&
          (reads[commit] ?? 0) >= run.length &&
          run[run.length - 1].status === "completed";

        return done ? (world.stagedWhenDone?.[commit] ?? null) : null;
      },
      stagingRun: async (commit: string) => runOf(commit),
      sleep: async (ms: number) => {
        clock += ms;
      },
      now: () => clock,
      log: (line: string) => lines.push(line),
      maxCommits: 50,
      waitMs: world.waitMs ?? 7_200_000,
      pollMs: 60_000,
    },
  };
}

describe("resolveStagedBuild", () => {
  it("promotes the merged commit when staging served it", async () => {
    const { deps: d } = deps({
      history: [sha(3), sha(2)],
      staged: { [sha(3)]: DIGEST(3) },
    });

    expect(await resolveStagedBuild(sha(3), d)).toEqual({
      ok: true,
      commit: sha(3),
      digest: DIGEST(3),
      skipped: [],
      documentation: [],
    });
  });

  it("promotes the nearest staged ancestor of a [skip ci] commit that only changed documentation", async () => {
    const { deps: d } = deps({
      history: [sha(5), sha(4), sha(3)],
      staged: { [sha(3)]: DIGEST(3) },
      diffs: {
        [`${sha(3)}..${sha(5)}`]: [
          "docs/deploy.md",
          "README.md",
          "CHANGELOG.md",
        ],
      },
    });

    expect(await resolveStagedBuild(sha(5), d)).toEqual({
      ok: true,
      commit: sha(3),
      digest: DIGEST(3),
      skipped: [sha(5), sha(4)],
      documentation: ["docs/deploy.md", "README.md", "CHANGELOG.md"],
    });
  });

  it("refuses when something other than documentation never ran in staging", async () => {
    const { deps: d } = deps({
      history: [sha(5), sha(4), sha(3)],
      staged: { [sha(3)]: DIGEST(3) },
      diffs: {
        [`${sha(3)}..${sha(5)}`]: [
          "docs/deploy.md",
          "src/app/page.tsx",
          "package.json",
        ],
      },
    });

    const result = await resolveStagedBuild(sha(5), d);

    expect(result.ok).toBe(false);
    expect(result.ok || result.reason).toMatch(
      /não rodou no staging, e a diferença para 3333333 .* não é só documentação: src\/app\/page\.tsx, package\.json/,
    );
  });

  it("waits for a staging run of the merged commit still going, then promotes it", async () => {
    const { deps: d, lines } = deps({
      history: [sha(3), sha(2)],
      runs: {
        [sha(3)]: [
          { status: "in_progress", conclusion: null },
          { status: "in_progress", conclusion: null },
          { status: "completed", conclusion: "success" },
        ],
      },
      stagedWhenDone: { [sha(3)]: DIGEST(3) },
    });

    expect(await resolveStagedBuild(sha(3), d)).toMatchObject({
      ok: true,
      commit: sha(3),
      digest: DIGEST(3),
    });
    expect(lines[0]).toMatch(
      /O run de staging de 3333333 ainda está em andamento/,
    );
  });

  it("refuses a staging run that finished without serving the build", async () => {
    const { deps: d } = deps({
      history: [sha(3), sha(2)],
      runs: {
        [sha(3)]: [
          { status: "queued", conclusion: null },
          { status: "completed", conclusion: "failure" },
        ],
      },
    });

    const result = await resolveStagedBuild(sha(3), d);

    expect(result.ok || result.reason).toMatch(
      /terminou \(failure, https:\/\/github\.com\/runs\/333\) sem gravar staged-3333333/,
    );
  });

  it("stops waiting at the deadline", async () => {
    const { deps: d } = deps({
      history: [sha(3)],
      runs: { [sha(3)]: [{ status: "in_progress", conclusion: null }] },
      waitMs: 180_000,
    });

    const result = await resolveStagedBuild(sha(3), d);

    expect(result.ok || result.reason).toMatch(/não terminou em 180s/);
  });

  it("refuses a commit whose staging run completed without the marker (failed or superseded)", async () => {
    const { deps: d } = deps({
      history: [sha(5), sha(4), sha(3)],
      staged: { [sha(3)]: DIGEST(3) },
      runs: { [sha(4)]: [{ status: "completed", conclusion: "success" }] },
    });

    const result = await resolveStagedBuild(sha(5), d);

    expect(result.ok || result.reason).toMatch(
      /4444444 rodou no staging \(success, .*\), mas não tem o marcador staged-4444444/,
    );
  });

  it("refuses when no recent commit has a staged build", async () => {
    const { deps: d } = deps({ history: [sha(3), sha(2), sha(1)] });

    const result = await resolveStagedBuild(sha(3), d);

    expect(result.ok || result.reason).toMatch(
      /Nenhum dos últimos 3 commits de 3333333 tem um build servido pelo staging/,
    );
  });

  it("lets a GHCR failure through instead of reading it as 'not staged'", async () => {
    const { deps: d } = deps({ history: [sha(3)] });

    d.stagedDigest = async () => {
      throw new Error("O GHCR não respondeu sobre ghcr.io/x:staged-3333333");
    };

    await expect(resolveStagedBuild(sha(3), d)).rejects.toThrow(
      /não respondeu/,
    );
  });
});
