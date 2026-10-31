import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";

/**
 * Runs the shell of a workflow step for real, with the commands it calls
 * (git, docker, npx…) replaced by stubs placed first on PATH.
 *
 * Reading a `run:` block as text proves little: an exit code swallowed by a
 * pipe, a retry loop that never stops, an error read as "no branch" only
 * show when the shell executes. Each step runs under `bash -eo pipefail`,
 * what GitHub runs for `shell: bash` (the workflows' `defaults`).
 *
 * Paths are handed over with forward slashes: Git Bash on a Windows machine
 * accepts `C:/...` everywhere, while a backslash inside a script is an
 * escape. The same harness idea as trajetto-api's shell-harness.ts.
 */

export const posix = (path: string) => path.replace(/\\/g, "/");

/** A workflow of this repository, line endings normalised. */
export function readWorkflow(name: string): string {
  return readFileSync(
    resolve(process.cwd(), ".github", "workflows", name),
    "utf8",
  ).replace(/\r\n/g, "\n");
}

/**
 * The `run: |` block of the step called `name` (the first one), dedented.
 * Empty when the step or its block is missing.
 */
export function runBlock(workflow: string, name: string): string {
  const lines = workflow.split("\n");
  const at = lines.findIndex((line) => line.trim() === `- name: ${name}`);

  if (at < 0) return "";

  const stepIndent = lines[at].search(/\S/);
  let index = at + 1;

  while (index < lines.length && !/^\s+run: \|$/.test(lines[index])) {
    // The next step, or the end of the job: this step has no block.
    if (lines[index].trim() !== "" && lines[index].search(/\S/) <= stepIndent)
      return "";

    index += 1;
  }

  if (index >= lines.length) return "";

  const indent = lines[index].search(/\S/) + 2;
  const body: string[] = [];

  for (let line = index + 1; line < lines.length; line += 1) {
    if (lines[line].trim() !== "" && lines[line].search(/\S/) < indent) break;

    body.push(lines[line].slice(indent));
  }

  return body.join("\n");
}

/**
 * Whether bash can run these scripts here. CI and Git Bash: yes. A `bash`
 * that resolves to WSL on a Windows shell starts fine but cannot read
 * `C:/...` paths, so the probe reads a file of the repository; those tests
 * are skipped, not failed.
 */
export function hasBash(): boolean {
  const probe = spawnSync(
    "bash",
    ["-c", `test -r "${posix(resolve(process.cwd(), "package.json"))}"`],
    { encoding: "utf8" },
  );

  return !probe.error && probe.status === 0;
}

/** The real binary behind a command, for a stub that wraps it. */
export function realCommand(name: string): string {
  const found = spawnSync("bash", ["-c", `command -v ${name}`], {
    encoding: "utf8",
  });

  return found.stdout.trim();
}

export interface Sandbox {
  /** Root of a throwaway directory, removed by `dispose`. */
  root: string;
  /** Directory prepended to PATH, holding the stubs. */
  bin: string;
  /** Writes an executable stub. The body runs after the call is logged. */
  stub(name: string, body: string): void;
  /** Writes a plain file under root and returns its path. */
  file(relative: string, content: string): string;
  /** Lines of the call log, optionally only those of one command. */
  calls(command?: string): string[];
  /** Runs `script` under bash -eo pipefail with the stubs first on PATH. */
  run(
    script: string,
    options?: { cwd?: string; env?: Record<string, string> },
  ): RunResult;
  dispose(): void;
}

export interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
  /** stdout and stderr together. */
  output: string;
  /** What the step wrote to $GITHUB_OUTPUT, as key → value. */
  outputs: Record<string, string>;
  /** What the step wrote to $GITHUB_STEP_SUMMARY. */
  summary: string;
}

export function sandbox(): Sandbox {
  const root = posix(mkdtempSync(join(tmpdir(), "trajetto-ui-sh-")));
  const bin = `${root}/bin`;
  const log = `${root}/calls.log`;
  let runs = 0;

  mkdirSync(bin, { recursive: true });
  writeFileSync(log, "");

  const file = (relative: string, content: string) => {
    const path = posix(resolve(root, relative));

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);

    return path;
  };

  return {
    root,
    bin,
    stub(name, body) {
      const path = `${bin}/${name}`;

      writeFileSync(
        path,
        `#!/usr/bin/env bash\nprintf '%s\\n' "${name} $*" >> "${log}"\n${body}\n`,
      );
      chmodSync(path, 0o755);
    },
    file,
    calls(command) {
      const lines = readFileSync(log, "utf8").split("\n").filter(Boolean);

      return command
        ? lines.filter(
            (line) => line.startsWith(`${command} `) || line === command,
          )
        : lines;
    },
    run(script, options = {}) {
      runs += 1;

      const path = file(`step-${runs}.sh`, `set -eo pipefail\n${script}\n`);
      const output = file(`github-output-${runs}`, "");
      const summary = file(`github-summary-${runs}`, "");
      // The sandbox's own files come last. A test's env often starts from
      // process.env, and on a GitHub runner that carries the job's REAL
      // GITHUB_OUTPUT: placed before it, the step wrote its outputs to the
      // runner's file and every assertion on them read nothing (green
      // locally, red in CI on 31/10/2026).
      const env: Record<string, string> = {
        ...(process.env as Record<string, string>),
        ...options.env,
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: summary,
        RUNNER_TEMP: root,
      };

      // Windows spells it `Path`; two spellings in one block is ambiguous.
      for (const key of Object.keys(env)) {
        if (key.toUpperCase() === "PATH") delete env[key];
      }

      env.PATH = `${bin}${delimiter}${process.env.PATH}`;

      const result = spawnSync("bash", [path], {
        cwd: options.cwd ?? root,
        env: env as unknown as NodeJS.ProcessEnv,
        encoding: "utf8",
        timeout: 60_000,
      });

      const outputs: Record<string, string> = {};

      for (const line of readFileSync(output, "utf8").split("\n")) {
        const at = line.indexOf("=");

        if (at > 0) outputs[line.slice(0, at)] = line.slice(at + 1);
      }

      const stdout = result.stdout ?? "";
      const stderr = result.stderr ?? "";

      return {
        status: result.status,
        stdout,
        stderr,
        output: `${stdout}${stderr}`,
        outputs,
        summary: readFileSync(summary, "utf8"),
      };
    },
    dispose() {
      if (existsSync(root)) rmSync(root, { recursive: true, force: true });
    },
  };
}
