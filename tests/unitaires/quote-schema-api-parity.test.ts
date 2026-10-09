// @vitest-environment node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { quoteSchema } from "@/schemas/quote-schema";

/**
 * The public quote form's schema against the API's, run on the same input.
 *
 * The web validates first and the API validates again. Where the web lets a
 * message through that the API refuses, the person only learns it after the
 * round trip, as a banner under the form and with the Turnstile token spent.
 * Round 2 of PUB-17 opened exactly that gap: the web accepted blank lines
 * and a space before a line break, which the API's `\s{2,}` still refuses.
 *
 * So the rule here is behavioural, not textual: whatever the web accepts,
 * the API accepts as the action sends it; whatever the web refuses, the API
 * refuses too (the web may not be stricter than the server). The API schema
 * runs for real, through its own tsx and tsconfig, in a child process.
 */

const API_DIR = resolve(__dirname, "../../../trajetto-api");
const TSX_CLI = join(API_DIR, "node_modules/tsx/dist/cli.mjs");
const API_SCHEMA = join(API_DIR, "src/schemas/create-quote-schema/index.ts");

const available = existsSync(TSX_CLI) && existsSync(API_SCHEMA);

const lead = {
  name: "Ana Souza",
  company: "Transportes Souza",
  email: "ana@example.com",
  telephone: "(11) 91234-5678",
  fleet_size: "6-15",
};

const MESSAGES: Array<[string, string | undefined]> = [
  ["no message", undefined],
  ["blank message", ""],
  ["spaces only", "   "],
  ["single line", "Quero uma demonstração."],
  ["LF line break", "Linha 1\nLinha 2"],
  ["CRLF line break (as the form posts it)", "Linha 1\r\nLinha 2"],
  ["lone CR", "Linha 1\rLinha 2"],
  ["three-line list", "Itens:\n- um\n- dois"],
  ["blank line between paragraphs (LF)", "Parágrafo 1\n\nParágrafo 2"],
  ["blank line between paragraphs (CRLF)", "Parágrafo 1\r\n\r\nParágrafo 2"],
  ["two blank lines", "P1\n\n\nP2"],
  ["space before the line break", "Linha 1 \nLinha 2"],
  ["space after the line break", "Linha 1\n Linha 2"],
  ["indented list", "Itens:\n - um\n - dois"],
  ["tab before the line break", "Linha 1\t\nLinha 2"],
  ["NBSP before the line break", "Linha 1 \nLinha 2"],
  ["whitespace-only line", "Linha 1\n \nLinha 2"],
  ["two spaces", "duas  palavras"],
  ["two tabs", "tab\t\tentre"],
  ["space and tab", "meio \tdo texto"],
  ["single tab", "tab\tsimples"],
  ["leading space", " começa com espaço"],
  ["trailing space", "termina com espaço "],
  ["trailing line break", "termina com quebra\r\n"],
  ["230 characters", "a".repeat(230)],
  ["231 characters", "a".repeat(231)],
  ["230 with one CRLF break", `${"a".repeat(129)}\r\n${"b".repeat(100)}`],
  ["231 with one CRLF break", `${"a".repeat(130)}\r\n${"b".repeat(100)}`],
];

const NAMES: Array<[string, string]> = [
  ["full name", "Ana Souza"],
  ["name without surname", "Ana"],
  ["name with two spaces", "Ana  Souza"],
  ["name with trailing space", "Ana Souza "],
];

interface Verdict {
  success: boolean;
  messages: string[];
}

interface Case {
  label: string;
  web: Verdict;
  /** What the API is given: the web's output when it accepted, else the input as the web would send it. */
  sent: Record<string, unknown>;
}

const PROBE = `
import { readFileSync } from "node:fs";
import { createQuoteSchema } from "@/schemas/create-quote-schema";

const payloads = JSON.parse(readFileSync(0, "utf8"));
const verdicts = payloads.map((payload) => {
  const result = createQuoteSchema.safeParse(payload);
  return {
    success: result.success,
    messages: result.success ? [] : result.error.issues.map((issue) => issue.message),
  };
});
process.stdout.write(JSON.stringify(verdicts));
`;

function webCase(label: string, payload: Record<string, unknown>): Case {
  const result = quoteSchema.safeParse(payload);

  // A refused payload never leaves the browser; the API is asked about the
  // same text with the form post's CRLF already turned into LF, which is the
  // only rewrite the web applies.
  const normalised =
    typeof payload.message === "string"
      ? { ...payload, message: payload.message.replace(/\r\n?/g, "\n") }
      : payload;

  return {
    label,
    web: {
      success: result.success,
      messages: result.success
        ? []
        : result.error.issues.map((issue) => issue.message),
    },
    sent: result.success
      ? (result.data as Record<string, unknown>)
      : normalised,
  };
}

const cases: Case[] = [
  ...MESSAGES.map(([label, message]) =>
    webCase(
      `message: ${label}`,
      message === undefined ? lead : { ...lead, message },
    ),
  ),
  ...NAMES.map(([label, name]) => webCase(label, { ...lead, name })),
];

let workdir = "";
let api: Verdict[] = [];

beforeAll(() => {
  if (!available) return;

  workdir = mkdtempSync(join(tmpdir(), "quote-parity-"));
  const probe = join(workdir, "probe.ts");
  writeFileSync(probe, PROBE);

  // cwd = the API, so tsx resolves its "@/…" paths and its own zod.
  const run = spawnSync(process.execPath, [TSX_CLI, probe], {
    cwd: API_DIR,
    input: JSON.stringify(cases.map((item) => item.sent)),
    encoding: "utf8",
    timeout: 60_000,
  });

  if (run.status !== 0) {
    throw new Error(`the API schema probe failed:\n${run.stderr}`);
  }

  api = JSON.parse(run.stdout) as Verdict[];
}, 90_000);

afterAll(() => {
  if (workdir) rmSync(workdir, { recursive: true, force: true });
});

describe.skipIf(!available)(
  `the quote schema on the web and in the API${available ? "" : " — skipped: ../trajetto-api is not checked out"}`,
  () => {
    it("the API returned one verdict per case", () => {
      expect(api).toHaveLength(cases.length);
    });

    it.each(cases.map((item, index) => [item.label, index] as const))(
      "%s: the web and the API decide the same",
      (_, index) => {
        const { web, sent } = cases[index];
        const server = api[index];

        // Web accepted and API refused: an error after the round trip.
        // Web refused and API accepted: the web is stricter than the server.
        expect(
          web.success,
          `web: ${JSON.stringify(web.messages)} · API: ${JSON.stringify(server.messages)} · enviado: ${JSON.stringify(sent.message ?? sent.name)}`,
        ).toBe(server.success);
      },
    );
  },
);
