// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  changedFiles,
  isDocumentation,
  notDocumentation,
} from "../../.github/scripts/docs-only.mjs";

/**
 * What counts as "documentation only" (decision D11, 30/10/2026).
 *
 * A commit that changes only documentation runs no pipeline when pushed
 * with `[skip ci]`, and the promote ships the build of its nearest staged
 * ancestor. That is only right if the two commits build the same image, so
 * the rule must be exactly what the build context leaves out: every `*.md`
 * and the repository's docs/ folder (.dockerignore). The site's own content
 * (.mdx under src/content) is code here.
 */
const SCRIPT = resolve(process.cwd(), ".github", "scripts", "docs-only.mjs");

describe("isDocumentation", () => {
  it.each([
    "README.md",
    "CHANGELOG.md",
    "AGENTS.md",
    "docs/deploy.md",
    "docs/fonte/imagem.png",
    "tests/ui/README.md",
    "src/components/site/README.md",
  ])("%s is documentation", (path) => {
    expect(isDocumentation(path)).toBe(true);
  });

  it.each([
    "src/content/docs/webhooks.mdx",
    "src/content/blog/torre-de-controle-na-pratica.mdx",
    "src/app/docs/page.tsx",
    "src/app/docs/_lib/guide-index.ts",
    "package.json",
    "yarn.lock",
    ".github/workflows/deploy.yml",
    "Dockerfile",
    ".dockerignore",
    "README.md.bak",
    "subdir/docs/file.ts",
  ])("%s is not", (path) => {
    expect(isDocumentation(path)).toBe(false);
  });

  it("lists what is not documentation", () => {
    expect(notDocumentation(["docs/a.md", "src/a.ts", "README.md"])).toEqual([
      "src/a.ts",
    ]);
  });
});

describe("the rule and the image", () => {
  const ignore = readFileSync(resolve(process.cwd(), ".dockerignore"), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

  it("matches what the build context leaves out", () => {
    expect(ignore).toContain("docs/");
    expect(ignore).toContain("**/*.md");
  });

  it("is not undone by an exception that brings documentation back into the build", () => {
    const reincluded = ignore.filter(
      (line) => line.startsWith("!") && isDocumentation(line.slice(1)),
    );

    expect(reincluded).toEqual([]);
  });
});

// Every case starts processes (git, bash, node) and waits for them to
// exit. Vitest's 5 s default is a deadline for that exit, and with the whole
// unit suite saturating the cores process start-up alone can take seconds.
// The deadline is generous; the waits inside the scripts stay the fast ones
// the env sets (the same reasoning as trajetto-api's dokploy-deploy.test.ts).
describe(
  "changedFiles and the CLI, against a real repository",
  { timeout: 30_000 },
  () => {
    let root: string;

    const env = () => ({
      ...process.env,
      GIT_CONFIG_GLOBAL: join(root, "gitconfig"),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_AUTHOR_NAME: "CI",
      GIT_AUTHOR_EMAIL: "ci@example.com",
      GIT_COMMITTER_NAME: "CI",
      GIT_COMMITTER_EMAIL: "ci@example.com",
    });

    /** git in the fixture repository, as changedFiles calls it. */
    const gitIn = (args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8", env: env() });
    const git = (...args: string[]) => gitIn(args).trim();
    const changed = (from: string, to: string) => changedFiles(from, to, gitIn);

    function write(path: string, content: string) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }

    function commit(message: string) {
      git("add", "-A");
      git("commit", "-q", "-m", message);

      return git("rev-parse", "HEAD");
    }

    const cli = (from: string, to: string) =>
      spawnSync(process.execPath, [SCRIPT, from, to], {
        cwd: root,
        encoding: "utf8",
        env: env(),
      });

    beforeEach(() => {
      root = mkdtempSync(join(tmpdir(), "trajetto-ui-docs-only-"));
      writeFileSync(join(root, "gitconfig"), "");
      git("init", "-q", "-b", "staging");
      write("src/app.ts", "export const a = 1;\n");
      write("docs/deploy.md", "# deploy\n");
    });

    afterEach(() => rmSync(root, { recursive: true, force: true }));

    it("passes a change to documentation only", () => {
      const from = commit("base");

      write("docs/deploy.md", "# deploy, revisto\n");
      write("README.md", "# leia\n");

      const to = commit("docs");

      expect(changed(from, to).sort()).toEqual(["README.md", "docs/deploy.md"]);
      expect(cli(from, to).status).toBe(0);
    });

    it("lists a moved source file under both names", () => {
      const from = commit("base");

      git("mv", "src/app.ts", "docs/app.md");

      const to = commit("move");
      const result = cli(from, to);

      expect(changed(from, to).sort()).toEqual(["docs/app.md", "src/app.ts"]);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("src/app.ts");
    });

    it("reads a name git would quote as the name itself", () => {
      const from = commit("base");

      write("docs/configuração.md", "# acentos\n");

      const to = commit("accents");

      expect(changed(from, to)).toEqual(["docs/configuração.md"]);
      expect(cli(from, to).status).toBe(0);
    });

    it("refuses a change to code, listing it", () => {
      const from = commit("base");

      write("src/app.ts", "export const a = 2;\n");
      write("docs/deploy.md", "# deploy 2\n");

      const result = cli(from, commit("code"));

      expect(result.status).toBe(1);
      expect(result.stdout).toContain("  src/app.ts");
      expect(result.stdout).not.toContain("docs/deploy.md");
    });

    it("says when git cannot compare (exit 2), never 'documentation only'", () => {
      const from = commit("base");
      const result = cli(from, "0".repeat(40));

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("::error::O git não comparou");
    });
  },
);
