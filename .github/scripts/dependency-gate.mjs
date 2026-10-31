#!/usr/bin/env node
/**
 * Does this push or pull request change the dependency tree? It decides
 * whether the dependency audit (audit-ci, ci.yml) blocks (decision D1,
 * 30/10/2026).
 *
 * audit-ci reads a live advisory database. A CRITICAL advisory published
 * today failed the next push of any commit — a fix that touched no
 * dependency included — although the tree was the same as yesterday's,
 * which had passed. So the audit always runs, but it only BLOCKS when this
 * change touched what decides the tree or the gate: package.json, yarn.lock,
 * a package-lock.json, or audit-ci.jsonc (its allowlist). Otherwise a
 * finding is a warning and a section of the run summary, and Dependabot's
 * security updates are the continuous watch.
 *
 * The comparison base: the pull request's base commit, or the commit the
 * push moved the branch from. Without one (a new branch, a manual run), or
 * when that commit is not available (a rewritten history), the change is
 * treated as touching the dependencies: the audit blocks.
 *
 * Environment:
 *   BASE_SHA             github.event.pull_request.base.sha || github.event.before
 *   HEAD_SHA             the commit checked out (default GITHUB_SHA)
 *   FETCH_RETRY_SECONDS  pause before fetching the base again (default 5, then 10)
 *
 * Writes `blocking=true|false` and `reason=<text>` to GITHUB_OUTPUT.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { changedFiles } from "./docs-only.mjs";

/** The files that decide the dependency tree, or the audit's allowlist. */
export const DEPENDENCY_MANIFEST =
  /(^|\/)(package\.json|yarn\.lock|package-lock\.json|audit-ci\.jsonc)$/;

/** @param {string[]} files */
export function dependencyManifests(files) {
  return files.filter((file) => DEPENDENCY_MANIFEST.test(file));
}

/**
 * @typedef {{
 *   hasCommit: (sha: string) => boolean,
 *   fetchCommit: (sha: string) => boolean,
 *   changedFiles: (from: string, to: string) => string[],
 * }} Deps
 * @param {{ base: string, head: string }} input
 * @param {Deps} deps
 * @returns {{ blocking: boolean, reason: string }}
 */
export function decide({ base, head }, deps) {
  const from = (base ?? "").trim();

  if (!/^[0-9a-f]{40}$/.test(from) || /^0{40}$/.test(from)) {
    return {
      blocking: true,
      reason:
        "sem commit base para comparar (branch nova ou execução manual): o audit bloqueia",
    };
  }

  if (!deps.hasCommit(from) && !deps.fetchCommit(from)) {
    return {
      blocking: true,
      reason: `o commit base ${from.slice(0, 7)} não está disponível (histórico reescrito?): o audit bloqueia`,
    };
  }

  let files;

  try {
    files = deps.changedFiles(from, head);
  } catch (error) {
    return {
      blocking: true,
      reason: `o git não comparou ${from.slice(0, 7)} com ${head.slice(0, 7)} (${error instanceof Error ? error.message.split("\n")[0] : String(error)}): o audit bloqueia`,
    };
  }

  const manifests = dependencyManifests(files);

  return manifests.length > 0
    ? {
        blocking: true,
        reason: `a mudança mexe em ${manifests.join(", ")}: o audit bloqueia`,
      }
    : {
        blocking: false,
        reason: `a mudança não mexe em package.json, yarn.lock nem audit-ci.jsonc (comparada com ${from.slice(0, 7)}): um achado vira aviso`,
      };
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** @type {Deps} */
const realDeps = {
  hasCommit: (sha) => {
    try {
      git(["cat-file", "-e", `${sha}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  },
  // A shallow checkout has only its own commit; one more is enough to
  // compare trees. GitHub serves a commit by its sha.
  fetchCommit: (sha) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        git(["fetch", "--no-tags", "--depth=1", "origin", sha]);
        return true;
      } catch (error) {
        const reason =
          error instanceof Error && "stderr" in error
            ? String(error.stderr).trim().split("\n").pop()
            : String(error);

        console.log(
          `::warning::git fetch de ${sha.slice(0, 7)} falhou (tentativa ${attempt} de 3): ${reason}`,
        );
      }

      // A blocking pause: this script has nothing else to do meanwhile.
      if (attempt < 3) {
        const pause = Number(process.env.FETCH_RETRY_SECONDS ?? 5) * 1000;

        Atomics.wait(
          new Int32Array(new SharedArrayBuffer(4)),
          0,
          0,
          attempt * pause,
        );
      }
    }

    return false;
  },
  changedFiles: (from, to) => changedFiles(from, to, git),
};

function main(env = process.env) {
  const head = env.HEAD_SHA || env.GITHUB_SHA || "";

  if (!/^[0-9a-f]{40}$/.test(head)) {
    console.error(
      "::error::HEAD_SHA (ou GITHUB_SHA) precisa ser um sha completo.",
    );
    return 1;
  }

  const { blocking, reason } = decide(
    { base: env.BASE_SHA ?? "", head },
    realDeps,
  );

  console.log(`Audit de dependências: ${reason}.`);

  if (env.GITHUB_OUTPUT) {
    appendFileSync(
      env.GITHUB_OUTPUT,
      `blocking=${blocking}\nreason=${reason.replace(/\n/g, " ")}\n`,
    );
  }

  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main());
}
