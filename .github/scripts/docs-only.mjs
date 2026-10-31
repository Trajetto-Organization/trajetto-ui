#!/usr/bin/env node
/**
 * Is the difference between two commits documentation only?
 *
 * Documentation is what the image never contains: every `*.md` file and the
 * repository's own docs/ folder. The build context drops exactly these
 * (.dockerignore: `docs/` and `**\/*.md`), so two commits that differ only
 * in documentation build the same image; tests/unitaires/docs-only.test.ts
 * holds the two lists together. The site's content is `.mdx` under
 * src/content, which this rule does not match.
 *
 * Who asks (decision D11, 30/10/2026):
 *   - deploy.yml, deploy-staging: a run whose commit is no longer staging's
 *     head still deploys when the newer head only adds documentation (a
 *     `[skip ci]` commit runs no pipeline of its own);
 *   - staged-build.mjs, in the promote: a merged commit with no staging run
 *     promotes the build of its nearest staged ancestor when everything in
 *     between is documentation.
 *
 * Renames are listed as a deletion plus an addition (`--no-renames`): a file
 * moved from src/ into docs/ is a change to src/. Paths come NUL-separated
 * (`-z`), so a name git would quote still reads as itself.
 *
 * CLI: node .github/scripts/docs-only.mjs <from> <to>
 *   exit 0: only documentation changed (or nothing); exit 1: something else
 *   changed (listed); exit 2: git could not compare the two commits.
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** The documentation paths: any Markdown file, and the top-level docs/. */
export const DOCUMENTATION_PATH = /^docs\/|\.md$/;

/** @param {string} path a repository path with forward slashes */
export function isDocumentation(path) {
  return DOCUMENTATION_PATH.test(path);
}

/** @param {string[]} files */
export function notDocumentation(files) {
  return files.filter((file) => !isDocumentation(file));
}

/** @param {string[]} args */
function runGit(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * The files that differ between two commits (trees compared, so it needs
 * the two commits, not the history between them).
 *
 * @param {string} from
 * @param {string} to
 * @param {(args: string[]) => string} [git]
 * @returns {string[]}
 */
export function changedFiles(from, to, git = runGit) {
  return git(["diff", "--name-only", "--no-renames", "-z", from, to, "--"])
    .split("\0")
    .filter(Boolean);
}

function main() {
  const [from, to] = process.argv.slice(2);

  if (!from || !to) {
    console.error("Uso: node .github/scripts/docs-only.mjs <de> <para>");
    return 2;
  }

  let files;

  try {
    files = changedFiles(from, to);
  } catch (error) {
    const reason =
      error instanceof Error && "stderr" in error && error.stderr
        ? String(error.stderr).trim()
        : String(error);

    console.error(
      `::error::O git não comparou ${from} e ${to}: ${reason.split("\n")[0]}`,
    );
    return 2;
  }

  const others = notDocumentation(files);

  if (others.length === 0) {
    console.log(
      `Entre ${from.slice(0, 7)} e ${to.slice(0, 7)} só mudou documentação (${files.length} arquivo(s)).`,
    );
    return 0;
  }

  console.log(
    `Entre ${from.slice(0, 7)} e ${to.slice(0, 7)} mudou mais que documentação:`,
  );

  for (const file of others.slice(0, 30)) console.log(`  ${file}`);

  if (others.length > 30) console.log(`  … e mais ${others.length - 30}`);

  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main());
}
