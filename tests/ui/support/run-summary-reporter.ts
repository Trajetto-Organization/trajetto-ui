import { appendFileSync } from "node:fs";
import { relative } from "node:path";

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
} from "@playwright/test/reporter";

/**
 * What a green browser-suite run still has to say.
 *
 * In CI each test gets one retry (the configs). A test that failed and then
 * passed left the job green, and the only trace of it was a "1 flaky" line at
 * the end of a long log nobody opens on a green run. This reporter makes it
 * visible without failing the job: a GitHub warning annotation per flaky test
 * (name, file, line and the first attempt's error) and a section in the run
 * summary ($GITHUB_STEP_SUMMARY). It also lists what the suites' own helpers
 * noted on a test: a request to a third party with no double (blocked,
 * support/hermetic.ts) and a click that had to be repeated before its target
 * opened (support/ui.ts).
 *
 * Outside GitHub Actions it prints the same findings as plain lines.
 */

interface Annotation {
  type: string;
  description?: string;
}

/** The parts of a TestCase this reads (a real one, or a stand-in in a unit test). */
interface TestLike {
  titlePath(): string[];
  location: { file: string; line: number };
  outcome(): string;
  annotations: Annotation[];
  results: Array<{
    status: string;
    error?: { message?: string };
    annotations?: Annotation[];
  }>;
}

interface Finding {
  title: string;
  file: string;
  line: number;
  detail: string;
}

interface RunFindings {
  flaky: Finding[];
  blocked: Finding[];
  repeatedClicks: Finding[];
}

const ANSI = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");

/** The test's name as the list reporter prints it, without the project and file. */
function titleOf(test: TestLike): string {
  return test
    .titlePath()
    .filter(Boolean)
    .filter((part) => !/\.spec\.ts$/.test(part))
    .join(" › ");
}

function firstLine(message: string | undefined): string {
  return (
    (message ?? "")
      .replace(ANSI, "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? "(sem mensagem)"
  );
}

function annotationsOf(test: TestLike): Annotation[] {
  const all = [
    ...test.annotations,
    ...test.results.flatMap((result) => result.annotations ?? []),
  ];
  const seen = new Set<string>();

  return all.filter((annotation) => {
    const key = `${annotation.type}\u0000${annotation.description ?? ""}`;

    if (seen.has(key)) return false;

    seen.add(key);

    return true;
  });
}

function collectRunFindings(tests: TestLike[], workspace: string): RunFindings {
  const findings: RunFindings = { flaky: [], blocked: [], repeatedClicks: [] };

  for (const test of tests) {
    const base = {
      title: titleOf(test),
      file: relative(workspace, test.location.file).replace(/\\/g, "/"),
      line: test.location.line,
    };

    if (test.outcome() === "flaky") {
      const failed = test.results.find(
        (result) => result.status !== "passed" && result.status !== "skipped",
      );

      findings.flaky.push({
        ...base,
        detail: firstLine(failed?.error?.message),
      });
    }

    for (const annotation of annotationsOf(test)) {
      if (annotation.type === "external-request-blocked") {
        findings.blocked.push({
          ...base,
          detail: annotation.description ?? "",
        });
      }

      if (annotation.type === "retry-click") {
        findings.repeatedClicks.push({
          ...base,
          detail: annotation.description ?? "",
        });
      }
    }
  }

  return findings;
}

/** A value inside a workflow command (GitHub's escaping rules). */
function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

function workflowCommand(
  level: "warning" | "notice",
  title: string,
  finding: Finding,
  message: string,
): string {
  return (
    `::${level} file=${escapeProperty(finding.file)},line=${finding.line},` +
    `title=${escapeProperty(title)}::${escapeData(message)}`
  );
}

/** The annotations GitHub turns into warnings on the run page. */
function workflowCommands(findings: RunFindings): string[] {
  return [
    ...findings.flaky.map((finding) =>
      workflowCommand(
        "warning",
        "Teste instável (passou só na nova tentativa)",
        finding,
        `${finding.title} — primeira tentativa: ${finding.detail}`,
      ),
    ),
    ...findings.blocked.map((finding) =>
      workflowCommand(
        "warning",
        "Requisição a terceiro sem dublê (bloqueada)",
        finding,
        `${finding.title} — ${finding.detail}`,
      ),
    ),
    ...findings.repeatedClicks.map((finding) =>
      workflowCommand(
        "notice",
        "Clique repetido até o alvo abrir",
        finding,
        `${finding.title} — ${finding.detail}`,
      ),
    ),
  ];
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function table(rows: Finding[], detailHeading: string): string[] {
  return [
    `| Teste | Arquivo | ${detailHeading} |`,
    "| --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${cell(row.title)} | \`${cell(row.file)}:${row.line}\` | ${cell(row.detail)} |`,
    ),
  ];
}

/** The section this run adds to the job summary. */
function summaryMarkdown(suite: string, findings: RunFindings): string {
  const lines = [`### Suíte de navegador: ${suite}`, ""];

  if (findings.flaky.length === 0) {
    lines.push(
      "Nenhum teste instável: todo teste passou na primeira tentativa.",
    );
  } else {
    lines.push(
      `**${findings.flaky.length} teste(s) instável(is)**: falharam na primeira tentativa e passaram na nova. ` +
        "O job continua verde, mas cada um é um defeito a corrigir (o teste ou o produto).",
      "",
      ...table(findings.flaky, "Erro da primeira tentativa"),
    );
  }

  if (findings.blocked.length > 0) {
    lines.push(
      "",
      `**${findings.blocked.length} requisição(ões) a terceiros sem dublê**, bloqueadas antes de sair do runner. ` +
        "Acrescente um dublê em `tests/ui/support/external-doubles.ts`.",
      "",
      ...table(findings.blocked, "Endereço"),
    );
  }

  if (findings.repeatedClicks.length > 0) {
    lines.push(
      "",
      `${findings.repeatedClicks.length} clique(s) repetido(s) até o alvo abrir (a página ainda hidratando).`,
      "",
      ...table(findings.repeatedClicks, "Detalhe"),
    );
  }

  return `${lines.join("\n")}\n\n`;
}

/**
 * "playwright.ui.config.ts" → "ui". Both separators on every OS: on Linux,
 * `path.basename` keeps a Windows path whole.
 */
function suiteName(configFile: string | undefined): string {
  const name =
    (configFile ?? "playwright.config.ts").split(/[\\/]/).pop() ?? "";

  return /^playwright\.(.+)\.config\.[cm]?[jt]s$/.exec(name)?.[1] ?? name;
}

class RunSummaryReporter implements Reporter {
  private config: FullConfig | null = null;
  private suite: Suite | null = null;

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
  }

  onEnd(_result: FullResult): void {
    const tests: TestCase[] = this.suite?.allTests() ?? [];
    const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
    const findings = collectRunFindings(tests, workspace);
    const suite = suiteName(this.config?.configFile);
    const onGitHub = process.env.GITHUB_ACTIONS === "true";

    if (onGitHub) {
      for (const command of workflowCommands(findings)) console.log(command);
    } else {
      for (const finding of findings.flaky) {
        console.log(
          `[instável] ${finding.title} (${finding.file}:${finding.line}): ${finding.detail}`,
        );
      }

      for (const finding of findings.blocked) {
        console.log(
          `[sem dublê] ${finding.title} (${finding.file}:${finding.line}): ${finding.detail}`,
        );
      }
    }

    const summary = process.env.GITHUB_STEP_SUMMARY;

    if (summary) appendFileSync(summary, summaryMarkdown(suite, findings));
  }
}

export default RunSummaryReporter;
export {
  collectRunFindings,
  escapeData,
  escapeProperty,
  suiteName,
  summaryMarkdown,
  workflowCommands,
};
export type { RunFindings, TestLike };
