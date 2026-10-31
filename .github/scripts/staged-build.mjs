#!/usr/bin/env node
/**
 * Which staging build a merge into main promotes.
 *
 * The promote ships the image staging served, never a rebuild: the build of
 * a commit carries the `staged-<7>` tag that deploy-staging writes last. Two
 * cases used to stop the promote with "rode este job de novo":
 *
 *   1. The merge came before staging finished with that commit. If a
 *      staging run of the commit is still going, this waits for it (up to
 *      STAGING_WAIT_SECONDS) and then reads the marker again (decision D10).
 *   2. The commit never ran in staging: a `[skip ci]` commit, which GitHub
 *      runs no workflow for. Its nearest first-parent ancestor with a
 *      staged build is promoted instead, but only when everything between
 *      the two is documentation (docs-only.mjs: `*.md` and docs/, which the
 *      image never contains). Anything else is refused: that change never
 *      went through staging (decision D11).
 *
 * A commit whose staging run finished without the marker (failed, or
 * superseded before it deployed) is refused, naming the run: staging never
 * served it.
 *
 * Environment:
 *   SOURCE_SHA            the staging commit the merge brought (40 hex)
 *   IMAGE                 ghcr.io/<owner>/<image> (default the web's)
 *   GITHUB_REPOSITORY     owner/repo, for the staging runs (set by Actions)
 *   GITHUB_API_URL        (set by Actions)
 *   GITHUB_TOKEN          reads the runs (the job needs `actions: read`)
 *   STAGING_WORKFLOW      the workflow file that deploys staging (default deploy.yml)
 *   STAGING_BRANCH        default staging
 *   STAGING_WAIT_SECONDS  how long to wait for a staging run still going (default 7200)
 *   STAGING_POLL_SECONDS  interval between reads of that run (default 60)
 *   MAX_COMMITS           how far back to look for a staged build (default 50)
 *
 * Writes `tag=sha-<7>` and `staged=<commit>` to GITHUB_OUTPUT and the
 * decision to the run summary. Exit 1, with the reason, when nothing can be
 * promoted.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { changedFiles, notDocumentation } from "./docs-only.mjs";
import {
  defaultDeps as ghcrDeps,
  failureMessage,
  inspectDigest,
} from "./ghcr.mjs";

const short = (sha) => sha.slice(0, 7);

/** Seconds for a message: whole in production, exact in the tests' 0.01 s. */
const seconds = (ms) => Number((ms / 1000).toFixed(2));

/**
 * @typedef {{ status: string, conclusion: string | null, url: string }} StagingRun
 * @typedef {{
 *   firstParents: (sha: string, max: number) => string[],
 *   changedFiles: (from: string, to: string) => string[],
 *   stagedDigest: (sha: string) => Promise<string | null>,
 *   stagingRun: (sha: string) => Promise<StagingRun | null>,
 *   sleep: (ms: number) => Promise<void>,
 *   now: () => number,
 *   log: (line: string) => void,
 *   maxCommits: number,
 *   waitMs: number,
 *   pollMs: number,
 * }} Deps
 * @typedef {{ ok: true, commit: string, digest: string, skipped: string[], documentation: string[] }
 *   | { ok: false, reason: string }} Resolution
 */

/**
 * Waits for a staging run still going to finish.
 *
 * @param {string} commit
 * @param {StagingRun} run
 * @param {Deps} deps
 * @returns {Promise<StagingRun | null>} the finished run, or null at the deadline
 */
async function waitForRun(commit, run, deps) {
  const deadline = deps.now() + deps.waitMs;
  let current = run;

  deps.log(
    `O run de staging de ${short(commit)} ainda está em andamento (${current.url}): esperando ele terminar, por até ${seconds(deps.waitMs)}s.`,
  );

  while (current.status !== "completed") {
    if (deps.now() >= deadline) return null;

    await deps.sleep(deps.pollMs);

    const next = await deps.stagingRun(commit);

    if (next) current = next;
  }

  return current;
}

/**
 * @param {string} source
 * @param {Deps} deps
 * @returns {Promise<Resolution>}
 */
export async function resolveStagedBuild(source, deps) {
  const ancestors = deps.firstParents(source, deps.maxCommits);
  const skipped = [];

  for (const commit of ancestors) {
    let digest = await deps.stagedDigest(commit);

    if (!digest) {
      const run = await deps.stagingRun(commit);

      if (!run) {
        // GitHub ran nothing for it: a `[skip ci]` commit, or one pushed
        // together with a newer one. Look further back.
        skipped.push(commit);
        continue;
      }

      if (run.status !== "completed") {
        const finished = await waitForRun(commit, run, deps);

        if (!finished) {
          return {
            ok: false,
            reason: `O run de staging de ${short(commit)} (${run.url}) não terminou em ${seconds(deps.waitMs)}s. Espere ele terminar e promova de novo.`,
          };
        }

        digest = await deps.stagedDigest(commit);

        if (!digest) {
          return {
            ok: false,
            reason: `O run de staging de ${short(commit)} terminou (${finished.conclusion ?? finished.status}, ${finished.url}) sem gravar staged-${short(commit)}: o staging não serviu esse build. Corrija em staging e faça o merge de novo.`,
          };
        }
      } else {
        return {
          ok: false,
          reason: `${short(commit)} rodou no staging (${run.conclusion ?? run.status}, ${run.url}), mas não tem o marcador staged-${short(commit)}: o run falhou, ou um commit mais novo o superou antes do deploy. O staging não serviu esse build: corrija em staging e faça o merge de novo.`,
        };
      }
    }

    if (commit === source) {
      return { ok: true, commit, digest, skipped, documentation: [] };
    }

    const files = deps.changedFiles(commit, source);
    const others = notDocumentation(files);

    if (others.length > 0) {
      const listed = others.slice(0, 20).join(", ");
      const more = others.length > 20 ? ` e mais ${others.length - 20}` : "";

      return {
        ok: false,
        reason: `${short(source)} não rodou no staging, e a diferença para ${short(commit)} (o build mais próximo que o staging serviu) não é só documentação: ${listed}${more}. Leve a mudança para staging com o pipeline (sem [skip ci]) e faça o merge de novo.`,
      };
    }

    return { ok: true, commit, digest, skipped, documentation: files };
  }

  return {
    ok: false,
    reason: `Nenhum dos últimos ${ancestors.length} commits de ${short(source)} tem um build servido pelo staging (staged-<7>). Faça o merge de um commit que passou pelo pipeline de staging.`,
  };
}

/** @param {string[]} args */
function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * The latest staging run of the workflow for a commit, or null when GitHub
 * ran none. Transport errors and 5xx are tried again; a 4xx fails (the
 * token, or the job's `actions: read`).
 */
function stagingRunReader(env, ghcr) {
  const base = (env.GITHUB_API_URL || "https://api.github.com").replace(
    /\/+$/,
    "",
  );
  const workflow = env.STAGING_WORKFLOW || "deploy.yml";
  const branch = env.STAGING_BRANCH || "staging";

  return async (sha) => {
    const url = `${base}/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${encodeURIComponent(workflow)}/runs?head_sha=${sha}&branch=${encodeURIComponent(branch)}&event=push&per_page=5`;

    for (let number = 1; ; number += 1) {
      let reason;
      let response = null;

      try {
        response = await fetch(url, {
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${env.GITHUB_TOKEN}`,
            "x-github-api-version": "2022-11-28",
          },
          signal: AbortSignal.timeout(30_000),
        });

        if (response.ok) {
          const body = await response.json();
          const runs = Array.isArray(body?.workflow_runs)
            ? body.workflow_runs
            : [];
          const latest = runs.sort((a, b) =>
            String(b.created_at).localeCompare(String(a.created_at)),
          )[0];

          return latest
            ? {
                status: String(latest.status),
                conclusion: latest.conclusion ?? null,
                url: String(latest.html_url),
              }
            : null;
        }

        reason = `HTTP ${response.status}`;
      } catch (error) {
        reason = error instanceof Error ? error.message : String(error);
      }

      // A 4xx other than 429 will not change on retry: the token, or the
      // job's `actions: read`.
      if (
        response &&
        !response.ok &&
        response.status < 500 &&
        response.status !== 429
      ) {
        throw new Error(
          `a API do GitHub recusou a leitura dos runs de staging (${reason}): confira a permissão actions: read do job`,
        );
      }

      if (number >= ghcr.attempts) {
        throw new Error(
          `a API do GitHub não respondeu sobre os runs de staging de ${short(sha)} depois de ${ghcr.attempts} tentativas (${reason})`,
        );
      }

      const pause = ghcr.pauseMs * 2 ** (number - 1);

      console.log(
        `::warning::A leitura dos runs de staging de ${short(sha)} falhou (tentativa ${number} de ${ghcr.attempts}: ${reason}); nova tentativa em ${seconds(pause)}s.`,
      );
      await ghcr.sleep(pause);
    }
  };
}

function summary(env, line) {
  console.log(line);
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
}

async function main(env = process.env) {
  const source = (env.SOURCE_SHA ?? "").trim().toLowerCase();

  if (!/^[0-9a-f]{40}$/.test(source)) {
    console.error(
      "::error::SOURCE_SHA precisa ser o sha completo do commit de staging.",
    );
    return 1;
  }

  for (const name of ["GITHUB_REPOSITORY", "GITHUB_TOKEN"]) {
    if (!env[name]) {
      console.error(`::error::Defina ${name}.`);
      return 1;
    }
  }

  const image = env.IMAGE || "ghcr.io/trajetto-organization/trajetto-ui";
  const ghcr = ghcrDeps(env);

  /** @type {Deps} */
  const deps = {
    firstParents: (sha, max) =>
      git(["rev-list", "--first-parent", `--max-count=${max}`, sha])
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    changedFiles: (from, to) => changedFiles(from, to, git),
    stagedDigest: async (sha) => {
      const ref = `${image}:staged-${short(sha)}`;
      const outcome = await inspectDigest(ref, ghcr);

      if (outcome.ok) return outcome.value;
      if (outcome.kind === "not-found") return null;

      throw new Error(failureMessage(outcome, ref));
    },
    stagingRun: stagingRunReader(env, ghcr),
    sleep: ghcr.sleep,
    now: () => Date.now(),
    log: (line) => console.log(line),
    maxCommits: Math.max(1, Math.floor(Number(env.MAX_COMMITS || 50))),
    waitMs: Math.max(0, Number(env.STAGING_WAIT_SECONDS ?? 7200) * 1000),
    pollMs: Math.max(0, Number(env.STAGING_POLL_SECONDS ?? 60) * 1000),
  };

  let resolution;

  try {
    resolution = await resolveStagedBuild(source, deps);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    console.error(
      `::error::Não foi possível achar o build de staging: ${reason}`,
    );
    return 1;
  }

  if (!resolution.ok) {
    console.error(`::error::${resolution.reason}`);
    return 1;
  }

  const { commit, digest, skipped, documentation } = resolution;

  if (env.GITHUB_OUTPUT) {
    appendFileSync(
      env.GITHUB_OUTPUT,
      `tag=sha-${short(commit)}\nstaged=${commit}\n`,
    );
  }

  if (commit === source) {
    summary(env, `Commit de staging a promover: ${commit} (${digest}).`);
  } else {
    summary(
      env,
      `Commit de staging a promover: ${commit} (${digest}). ${short(source)} não rodou no staging (${skipped.length} commit(s) sem run), e a diferença até ele é só documentação (${documentation.length} arquivo(s)): a imagem é a mesma.`,
    );
  }

  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(await main());
}
