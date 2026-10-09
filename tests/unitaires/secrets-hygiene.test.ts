import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Secrets stay out of the repository, and a new one is caught (INFRA-21).
 *
 * The .gitignore listed env files one by one, so `.env.test` and
 * `.env.production.local` — both names Next reads — could be committed by a
 * plain `git add .`. It now ignores every `.env*` but the example, plus the
 * key files that live next to the repositories (the Firebase admin SDK key,
 * service accounts). The branch CI runs gitleaks over every commit.
 */
const ROOT = process.cwd();

function isIgnored(path: string): boolean {
  try {
    // --no-index: the pattern decides, whatever is or is not tracked.
    execFileSync("git", ["check-ignore", "-q", "--no-index", path], {
      cwd: ROOT,
      stdio: "ignore",
    });
    return true;
  } catch (error) {
    if ((error as { status?: number }).status === 1) return false;
    throw error;
  }
}

describe("the .gitignore", () => {
  it.each([
    ".env",
    ".env.test",
    ".env.production.local",
    ".env.staging",
    "trajetto-640d0-firebase-adminsdk-fbsvc-0a1b2c3d4e.json",
    "service-account.json",
  ])("keeps %s out", (path) => {
    expect(isIgnored(path)).toBe(true);
  });

  it("lets .env.example in", () => {
    expect(isIgnored(".env.example")).toBe(false);
  });
});

describe("the branch CI", () => {
  it("scans the whole history with gitleaks, pinned by digest", () => {
    const ci = readFileSync(resolve(ROOT, ".github/workflows/ci.yml"), "utf8");

    expect(ci).toMatch(/fetch-depth: 0/);
    expect(ci).toMatch(/zricethezav\/gitleaks:v8[\d.]+@sha256:[0-9a-f]{64}/);
    expect(ci).toMatch(/gitleaks git \/repo --redact[^\n]*--exit-code 1/);
  });

  // gitleaks' generic rule fires on any `TOKEN = "…"`: the tests' fake
  // tokens and passwords. The work waiting to be committed already had two
  // of them, so the first push would turn the job red for good. Quieted for
  // that rule and those paths only: a provider key (Anthropic, GitHub, AWS,
  // …) in a test still fails.
  it("keeps every default rule and quiets only the generic one, only on fixtures", () => {
    const path = resolve(ROOT, ".gitleaks.toml");

    expect(existsSync(path), ".gitleaks.toml").toBe(true);

    const config = readFileSync(path, "utf8").replace(/^\s*#.*$/gm, "");

    expect(config).toMatch(/^\[extend\]\s*\n\s*useDefault\s*=\s*true\s*$/m);
    expect(config).not.toMatch(/^\[allowlist\]/m);
    expect(config).not.toMatch(/^\[\[rules\]\]/m);

    const allowlists = config.split(/^\[\[allowlists\]\]\s*$/m).slice(1);

    expect(allowlists).toHaveLength(1);
    expect(allowlists[0]).toMatch(
      /^targetRules\s*=\s*\[\s*"generic-api-key"\s*\]\s*$/m,
    );
    expect(allowlists[0]).not.toMatch(/^\s*(?:commits|regexes|stopwords)\s*=/m);

    const paths = [...allowlists[0].matchAll(/'''([^']+)'''/g)].map(
      (match) => match[1],
    );

    expect(paths.length).toBeGreaterThan(0);
    expect(
      paths.filter(
        (entry) => !/^\^tests\/$|^\^\\\.env\\\.example\$$/.test(entry),
      ),
    ).toEqual([]);
  });
});

/** The jobs of a workflow by key: from `  <key>:` up to the next job. */
function jobsOf(workflow: string): Map<string, string> {
  const section = workflow.slice(workflow.search(/^jobs:\s*$/m));
  const chunks = section.split(/\r?\n(?= {2}[\w-]+:\s*\r?\n)/).slice(1);

  return new Map(
    chunks.map((chunk) => [/^ {2}([\w-]+):/.exec(chunk)![1], chunk]),
  );
}

/** `needs: a` or `needs: [a, b]`, the two forms these workflows use. */
function needsOf(job: string): string[] {
  const needs = /^ {4}needs:\s*(.+)$/m.exec(job)?.[1] ?? "";

  return needs
    .replace(/[[\]]/g, "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

/** The `docker run … gitleaks …` command of a job, whitespace-insensitive. */
function gitleaksCommand(job: string): string {
  const command =
    /docker run[^\n]*\\\s*\n[^\n]*zricethezav\/gitleaks[\s\S]*?--exit-code 1"/.exec(
      job,
    )?.[0] ?? "";

  return command.replace(/\s+/g, " ");
}

/**
 * The image was once built and published without the scan (INFRA-21): ci.yml
 * only triggered on the other branches, so a push that brought a key in
 * still shipped. deploy.yml now builds only on staging, after calling ci.yml
 * itself (workflow_call) — the very same `secrets` job, not a copy — and the
 * build job needs that call to pass.
 */
describe("the deploy pipeline", () => {
  const ciSource = readFileSync(
    resolve(ROOT, ".github/workflows/ci.yml"),
    "utf8",
  );
  const ci = jobsOf(ciSource);
  const deploy = jobsOf(
    readFileSync(resolve(ROOT, ".github/workflows/deploy.yml"), "utf8"),
  );

  it("runs the branch CI's own history scan, through workflow_call", () => {
    expect(ciSource).toMatch(/\n {2}workflow_call:\r?\n/);
    expect(
      deploy.get("validate") ?? "",
      "validate job in deploy.yml",
    ).toContain("uses: ./.github/workflows/ci.yml");
    expect(gitleaksCommand(ci.get("secrets") ?? "")).not.toBe("");
  });

  it("builds no image before the scan passes", () => {
    const builds = [...deploy].filter(([, job]) =>
      /uses: docker\/build-push-action@/.test(job),
    );

    expect(builds.length).toBeGreaterThan(0);

    for (const [name, job] of builds)
      expect(needsOf(job), name).toContain("validate");
  });
});
