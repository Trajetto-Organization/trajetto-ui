// @vitest-environment node
import { mkdirSync, writeFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  hasBash,
  readWorkflow,
  runBlock,
  sandbox,
  type Sandbox,
} from "./helpers/workflow-shell";

/**
 * The image scan's steps in deploy.yml, run for real with `docker` stubbed
 * (decision D6, 30/10/2026).
 *
 * Every scan downloaded Trivy's database from a rate-limited source, and
 * `continue-on-error` hid both a failed download and the findings. Now the
 * database is cached (one download a day at most), a failed download falls
 * back to the cached copy, and the run summary tells "the download failed"
 * from "the scan found something" from "the scan could not run". Report-only
 * (IMAGE_SCAN_ENFORCE unset) nothing fails the build; enforced, only a
 * finding does. A scan that could not run is never a red build, enforced or
 * not (the same rule as trajetto-api): it is not a defect of the commit.
 */
const workflow = readWorkflow("deploy.yml");
const DOWNLOAD = runBlock(workflow, "Download the vulnerability database");
const SCAN = runBlock(
  workflow,
  "Scan the image for fixable critical vulnerabilities",
);
const SHA = "0a1b2c3d4e5f60718293a4b5c6d7e8f901234567";

/** docker answering STUB_ANSWERS in turn (the last repeats). */
const DOCKER = `
count_file="$(dirname "$0")/docker-count"
count=$(( $(cat "$count_file" 2>/dev/null || echo 0) + 1 ))
echo "$count" > "$count_file"
set -- $STUB_ANSWERS
index=$count
[ "$index" -gt "$#" ] && index=$#
eval "code=\\\${$index}"
exit "$code"`;

// Every case starts processes (git, bash, node) and waits for them to
// exit. Vitest's 5 s default is a deadline for that exit, and with the whole
// unit suite saturating the cores process start-up alone can take seconds.
// The deadline is generous; the waits inside the scripts stay the fast ones
// the env sets (the same reasoning as trajetto-api's dokploy-deploy.test.ts).
describe.skipIf(!hasBash())(
  "the image scan steps (D6)",
  { timeout: 30_000 },
  () => {
    let box: Sandbox;
    let cache: string;

    beforeEach(() => {
      box = sandbox();
      box.stub("docker", DOCKER);
      cache = `${box.root}/trivy-cache`;
    });

    afterEach(() => box.dispose());

    const env = (answers: number[], extra: Record<string, string> = {}) => ({
      STUB_ANSWERS: answers.join(" "),
      TRIVY_CACHE: cache,
      TRIVY_RETRY_SECONDS: "0",
      GITHUB_SHA: SHA,
      IMAGE: `ghcr.io/trajetto-organization/trajetto-ui@sha256:${"a".repeat(64)}`,
      ...extra,
    });

    describe("the database download", () => {
      it("is fresh when Trivy downloads it (or finds it current)", () => {
        const result = box.run(DOWNLOAD, { env: env([0]) });

        expect(result.status, result.output).toBe(0);
        expect(result.outputs).toMatchObject({ fresh: "true", db: "ready" });
        expect(box.calls("docker")[0]).toContain("--download-db-only");
      });

      it("falls back to the cached copy when every try fails, and says so", () => {
        mkdirSync(`${cache}/db`, { recursive: true });
        writeFileSync(
          `${cache}/db/metadata.json`,
          '{"Version":2,"NextUpdate":"2026-10-30T12:00:00Z","UpdatedAt":"2026-10-29T06:00:00Z"}',
        );

        const result = box.run(DOWNLOAD, { env: env([1]) });

        expect(result.status, result.output).toBe(0);
        expect(result.outputs).toMatchObject({ fresh: "false", db: "ready" });
        expect(box.calls("docker")).toHaveLength(3);
        expect(
          result.output.match(
            /::warning::O download do banco do Trivy falhou/g,
          ),
        ).toHaveLength(3);
        expect(result.summary).toContain(
          "o download do banco falhou; o scan usa a cópia do cache (atualizada em 2026-10-29T06:00:00Z)",
        );
      });

      it("reports a failed download with no copy as a download failure, not a finding", () => {
        const result = box.run(DOWNLOAD, { env: env([1]) });

        expect(result.status, result.output).toBe(0);
        expect(result.outputs).toMatchObject({ fresh: "false", db: "missing" });
        expect(result.summary).toContain("**falha no download do banco**");
        expect(result.summary).toContain("Isto não é um achado.");
      });

      it("recovers when a later try succeeds", () => {
        const result = box.run(DOWNLOAD, { env: env([1, 0]) });

        expect(result.outputs).toMatchObject({ fresh: "true", db: "ready" });
        expect(box.calls("docker")).toHaveLength(2);
      });
    });

    describe("the scan", () => {
      const scan = (answers: number[], enforce: boolean, db = "ready") =>
        box.run(SCAN, {
          env: env(answers, { ENFORCE: String(enforce), DB: db }),
        });

      it("reads the cached database and never updates it", () => {
        scan([0], false);

        const call = box.calls("docker")[0];

        expect(call).toContain("--skip-db-update");
        expect(call).toContain("--cache-dir /trivy-cache");
        expect(call).toContain("--exit-code 5");
      });

      it("says there is nothing when Trivy finds nothing", () => {
        const result = scan([0], true);

        expect(result.status, result.output).toBe(0);
        expect(result.summary).toContain(
          "nenhuma vulnerabilidade CRITICAL com correção em sha-0a1b2c3",
        );
      });

      it("report-only, a finding is a warning and a summary line", () => {
        const result = scan([5], false);

        expect(result.status, result.output).toBe(0);
        expect(result.summary).toContain("**achados**");
        expect(result.output).toContain("::warning::O Trivy achou");
        expect(box.calls("docker")).toHaveLength(1);
      });

      it("enforced, a finding fails the job", () => {
        const result = scan([5], true);

        expect(result.status).toBe(1);
        expect(result.output).toContain("::error::O Trivy achou");
      });

      it("tries a failing scan again, and a later finding is still a finding", () => {
        const result = scan([1, 5], true);

        expect(result.status).toBe(1);
        expect(box.calls("docker")).toHaveLength(2);
        expect(result.summary).toContain("**achados**");
      });

      it("report-only, a scan that keeps failing is reported as such, not as a finding", () => {
        const result = scan([1], false);

        expect(result.status, result.output).toBe(0);
        expect(box.calls("docker")).toHaveLength(3);
        expect(result.summary).toContain(
          "**o scan falhou** (código 1: erro do Trivy ou do GHCR, não achado)",
        );
      });

      it("enforced, a scan that could not run warns, saying it is not a finding", () => {
        const result = scan([1], true);

        expect(result.status, result.output).toBe(0);
        expect(box.calls("docker")).toHaveLength(3);
        expect(result.output).toMatch(
          /::warning::O scan do Trivy não rodou até o fim \(código 1\) em 3 tentativas: falha do Trivy ou do GHCR, não achado/,
        );
        expect(result.summary).toContain("**o scan falhou**");
      });

      it("without a database: report-only skips quietly (the download step reported it)", () => {
        const result = scan([0], false, "missing");

        expect(result.status).toBe(0);
        expect(box.calls("docker")).toHaveLength(0);
      });

      it("without a database: enforced warns, saying it was the download", () => {
        const result = scan([0], true, "missing");

        expect(result.status, result.output).toBe(0);
        expect(result.output).toContain(
          "::warning::IMAGE_SCAN_ENFORCE=true, mas o banco do Trivy não está disponível (falha no download, não achado)",
        );
        expect(box.calls("docker")).toHaveLength(0);
      });
    });

    it("caches the database by day and saves only a fresh copy, before the scan", () => {
      const names = [...workflow.matchAll(/\n {6}- name: ([^\n]+)/g)].map(
        (match) => match[1],
      );
      const restore = workflow.slice(
        workflow.indexOf("- name: Restore the vulnerability database"),
      );
      const save = workflow.slice(
        workflow.indexOf("- name: Save the vulnerability database"),
      );

      expect(restore).toMatch(
        /uses: actions\/cache\/restore@[0-9a-f]{40} # v\d+\.\d+\.\d+\n\s+with:\n\s+path: \$\{\{ runner\.temp \}\}\/trivy-cache\n\s+key: trivy-db-0\.74\.0-\$\{\{ steps\.trivy-db\.outputs\.day \}\}\n\s+restore-keys: trivy-db-0\.74\.0-\n/,
      );
      expect(save).toMatch(
        /if: steps\.trivy-download\.outputs\.fresh == 'true' && steps\.trivy-cache\.outputs\.cache-hit != 'true'\n\s+continue-on-error: true\n\s+uses: actions\/cache\/save@/,
      );
      expect(names.indexOf("Save the vulnerability database")).toBeLessThan(
        names.indexOf("Scan the image for fixable critical vulnerabilities"),
      );
      expect(names.indexOf("Download the vulnerability database")).toBeLessThan(
        names.indexOf("Save the vulnerability database"),
      );
      // The key names the Trivy the scan runs.
      expect(workflow).toMatch(/aquasec\/trivy:0\.74\.0@sha256:/);
    });
  },
);
