// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { afterEach, describe, expect, it, vi } from "vitest";

import { LegalIdentity } from "@/components/legal/legal-identity";
import { legalMdxComponents } from "@/components/legal/legal-prose";

import {
  getLegalDocument,
  getLegalDocuments,
  loadLegalDocuments,
} from "@/lib/content/legal";
import { LEGAL_DOCUMENTS } from "@/lib/content/legal-documents";
import { renderMdx } from "@/lib/content/mdx";
import { buildContentSecurityPolicy } from "@/lib/content-security-policy";

/**
 * The legal texts against the code that makes them true.
 *
 * A period, a data category or a third party printed in a policy is a promise
 * to the people it describes. Each one below is read from the code that
 * enforces it (in this app, in the API and in the driver app) and compared
 * with every place the texts state it. Changing one side without the other
 * fails here.
 *
 * Facts that live in a sibling repository are skipped, visibly, when it is
 * not checked out next to this one (the web's own CI checkout).
 */

// Vitest compiles TSX with the classic runtime; LegalIdentity never imports React.
(globalThis as { React?: typeof React }).React ??= React;

type Slug = "privacidade" | "termos" | "cookies";

const SLUGS: Slug[] = ["privacidade", "termos", "cookies"];

const ROOT = process.cwd();
// Overridable so a mutation run can point the facts at a patched copy of a
// sibling repository and watch the texts go red.
const API = process.env.LEGAL_FACTS_API ?? resolve(ROOT, "..", "trajetto-api");
const MOBILE =
  process.env.LEGAL_FACTS_MOBILE ?? resolve(ROOT, "..", "trajetto-mobile");

const HAS_API = existsSync(resolve(API, "src"));
const HAS_MOBILE = existsSync(resolve(MOBILE, "package.json"));

afterEach(() => {
  vi.unstubAllEnvs();
});

function read(file: string): string {
  if (!existsSync(file)) {
    throw new Error(`arquivo não encontrado: ${relative(ROOT, file)}`);
  }

  return readFileSync(file, "utf8");
}

const api = (path: string) => read(resolve(API, path));
const mobile = (path: string) => read(resolve(MOBILE, path));
const web = (path: string) => read(resolve(ROOT, path));

/** Every .ts/.tsx under `dir`, tests and dependencies left out. */
function codeFiles(
  dir: string,
  skip: (path: string) => boolean = () => false,
): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const rel = relative(ROOT, path).replace(/\\/g, "/");

    if (name === "node_modules" || name === ".next" || skip(rel)) return [];
    if (statSync(path).isDirectory()) return codeFiles(path, skip);

    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** The driver app's source folders (no tests, no native build). */
function mobileCode(): string[] {
  return [
    "app",
    "components",
    "features",
    "hooks",
    "providers",
    "schemas",
    "store",
    "types",
    "utils",
  ].flatMap((dir) => codeFiles(resolve(MOBILE, dir)));
}

/**
 * Use cases that only read or guard a column, and error classes. None of them
 * records anything: the delete-driver guard counts pauses (driver_pause is
 * RESTRICT) and the route monitoring reads on_the_way_at while nothing writes
 * either, which made both features look shipped.
 */
const READ_OR_GUARD_USECASE =
  /[\\/](?:errors|(?:delete|list|get|search|export)-[^\\/]*|[^\\/]*(?:monitoring|preview)[^\\/]*)[\\/]/;

/**
 * The API's use cases that record data matching `pattern`: where a feature
 * exists, as opposed to a schema column or a screen that reads it.
 */
function apiUseCasesMatching(pattern: RegExp, module = "*"): string[] {
  const modules = resolve(API, "src", "modules");
  const names = module === "*" ? readdirSync(modules) : [module];

  return names
    .flatMap((name) => codeFiles(resolve(modules, name, "usecases")))
    .filter((file) => !READ_OR_GUARD_USECASE.test(file))
    .filter((file) => pattern.test(readFileSync(file, "utf8")));
}

/**
 * The value of a numeric expression as the code writes it: integer literals
 * (with `_` separators), constants declared in `sources`, `*` and `+`.
 */
function evaluate(expression: string, sources: string[]): number {
  return expression
    .split("+")
    .map((term) =>
      term
        .split("*")
        .map((raw) => {
          const factor = raw.trim();
          if (/^\d[\d_]*$/.test(factor))
            return Number(factor.replace(/_/g, ""));
          return constantIn(sources, factor);
        })
        .reduce((product, value) => product * value, 1),
    )
    .reduce((sum, value) => sum + value, 0);
}

function constantIn(sources: string[], name: string): number {
  for (const text of sources) {
    const match = new RegExp(String.raw`\bconst\s+${name}\s*=\s*([^;]+);`).exec(
      text,
    );
    if (match) return evaluate(match[1], sources);
  }

  throw new Error(`constante ${name} não encontrada`);
}

/** The `.default(n)` of an env var in the API's zod schema. */
function envDefault(schema: string, name: string): number {
  const match = new RegExp(
    String.raw`\b${name}:[\s\S]*?\.default\(\s*(\d[\d_]*)\s*\)`,
  ).exec(schema);
  if (!match) throw new Error(`default de ${name} não encontrado`);

  return Number(match[1].replace(/_/g, ""));
}

function plural(value: number, one: string, many: string): string {
  return `${value} ${value === 1 ? one : many}`;
}

/** How the policies write a number of days: whole years as years. */
function days(value: number): string {
  return value % 365 === 0
    ? plural(value / 365, "ano", "anos")
    : plural(value, "dia", "dias");
}

/** Whole days from two up; a single day reads as "24 horas". */
function seconds(value: number): string {
  if (value % 86_400 === 0 && value > 86_400) return days(value / 86_400);
  if (value % 3_600 === 0) return plural(value / 3_600, "hora", "horas");
  if (value % 60 === 0) return plural(value / 60, "minuto", "minutos");
  return plural(value, "segundo", "segundos");
}

function body(slug: Slug): string {
  const doc = loadLegalDocuments().find((item) => item.slug === slug);
  if (!doc) throw new Error(`documento ${slug} não registrado`);

  return doc.body;
}

/**
 * A document as a reader gets it: the notes for the lawyer (MDX comments)
 * out, one space between words, so a sentence wrapped over two lines matches.
 */
function text(slug: Slug): string {
  return body(slug)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * A stated duration. Not preceded by a digit, so "80 dias" never matches
 * inside "180 dias".
 */
const DURATION = String.raw`(?<![\d.,])(\d+ (?:segundos?|minutos?|horas?|dias?|meses|mês|anos?))(?![\p{L}\d])`;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

interface Stated {
  value: string;
  /** Where the number starts in `text(slug)`. */
  index: number;
}

/** Every place `template` (literal text, `§` for the duration) appears. */
function statedAt(slug: Slug, template: string): Stated[] {
  const [before, after = ""] = template.split("§");
  const pattern = new RegExp(
    escapeRegExp(before) + DURATION + escapeRegExp(after),
    "gu",
  );

  return [...text(slug).matchAll(pattern)].map((match) => ({
    value: match[1],
    index: (match.index ?? 0) + before.length,
  }));
}

function durationsIn(slug: Slug): Stated[] {
  return [...text(slug).matchAll(new RegExp(DURATION, "gu"))].map((match) => ({
    value: match[1],
    index: match.index ?? 0,
  }));
}

/** The table row whose first cell starts with `label`. Exactly one. */
function rowOf(slug: Slug, label: string): string {
  const rows = body(slug)
    .split("\n")
    .filter((line) => line.trim().startsWith(`| ${label}`));

  expect(rows, `${slug}.mdx: uma linha de tabela para "${label}"`).toHaveLength(
    1,
  );

  return rows[0];
}

/** The row of the processors table (section 9 of the privacy policy). */
function processorRow(provider: string): string {
  const section =
    /\n## 9\.[\s\S]*?(?=\n## 10\.)/.exec(body("privacidade"))?.[0] ?? "";
  const rows = section
    .split("\n")
    .filter(
      (line) =>
        line.startsWith("| ") && (line.split("|")[1] ?? "").includes(provider),
    );

  expect(rows, `privacidade.mdx §9: uma linha para ${provider}`).toHaveLength(
    1,
  );

  return rows[0];
}

/**
 * A part of a document as a reader gets it: from its heading (`## 4.` or
 * `### Pausas do motorista`) to the next heading of the same or a higher
 * level.
 */
function sectionOf(slug: Slug, heading: string): string {
  const level = /^#+/.exec(heading)?.[0] ?? "##";
  const start = body(slug).indexOf(`\n${heading}`);

  expect(start, `${slug}.mdx: seção "${heading}"`).toBeGreaterThanOrEqual(0);

  const rest = body(slug).slice(start + heading.length + 1);
  const next = new RegExp(String.raw`\n#{2,${level.length}} `).exec(rest);

  return (next ? rest.slice(0, next.index) : rest)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\s+/g, " ");
}

/** The sentence of a document that starts with `opening`, up to its period. */
function sentenceOf(slug: Slug, opening: string): string {
  const sentences = [
    ...text(slug).matchAll(new RegExp(escapeRegExp(opening) + "[^.]*\\.", "g")),
  ].map((match) => match[0]);

  expect(
    sentences,
    `${slug}.mdx: uma frase que começa com "${opening}"`,
  ).toHaveLength(1);

  return sentences[0];
}

/** The words of a list as the texts write it ("a, b ou c", "a, b e c"). */
const listWords = (list: string) =>
  list
    .split(/, | ou | e /)
    .map((word) => word.trim())
    .filter(Boolean)
    .sort();

/** The Prisma schema with LF line ends (the file may be checked out with CRLF). */
const prismaSchema = () => api("prisma/schema.prisma").replace(/\r\n/g, "\n");

/** The fields of a Prisma model, relations included, as the schema names them. */
function modelFields(model: string): string[] {
  const block = new RegExp(String.raw`\nmodel ${model} \{([\s\S]*?)\n\}`).exec(
    prismaSchema(),
  )?.[1];
  if (!block) throw new Error(`model ${model} não encontrado no schema.prisma`);

  return block
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter((line) => line && !line.startsWith("@@"))
    .map((line) => line.split(/\s+/)[0]);
}

/** The values of a Prisma enum. */
function enumValues(name: string): string[] {
  const block = new RegExp(String.raw`\nenum ${name} \{([\s\S]*?)\n\}`).exec(
    prismaSchema(),
  )?.[1];
  if (!block) throw new Error(`enum ${name} não encontrado no schema.prisma`);

  return block
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter(Boolean);
}

/**
 * The balanced `{…}` opened by the last `{` of the first match of `opening`
 * (a string or a pattern ending in `{`): an object, a select or a function
 * body, read whole instead of up to the first `}`.
 */
function blockAfter(source: string, opening: string | RegExp): string {
  const match =
    typeof opening === "string"
      ? { index: source.indexOf(opening), length: opening.length }
      : ((found) =>
          found
            ? { index: found.index, length: found[0].length }
            : { index: -1, length: 0 })(opening.exec(source));

  if (match.index < 0) throw new Error(`"${String(opening)}" não encontrado`);

  const open = match.index + match.length - 1;
  if (source[open] !== "{")
    throw new Error(`"${String(opening)}" não termina em {`);

  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(open, index + 1);
  }

  throw new Error(`bloco "${String(opening)}" sem fechamento`);
}

/** The names of a signature's parameters (`imagePath: string, spec: X` → both names). */
function parameterNames(signature: string): string[] {
  return signature
    .split(",")
    .map((param) => param.trim())
    .filter(Boolean)
    .map((param) => param.split(/[?:=]/)[0].trim());
}

type Origin = "api" | "mobile" | "web" | "lei";

const AVAILABLE: Record<Origin, boolean> = {
  api: HAS_API,
  mobile: HAS_MOBILE,
  web: true,
  lei: true,
};

interface Fact {
  name: string;
  /** Where the value is enforced, for the test's name and its skip. */
  origin: Origin;
  source: string;
  /** The value as the texts write it ("90 dias"). */
  value: () => string;
  /** Every place a text states it, `§` for the duration. */
  stated: Array<[Slug, string]>;
}

function apiAuthPolicies(): {
  webIdle: number;
  mobileIdle: number;
  mobileCap: number;
} {
  const auth = api("src/config/auth.ts");

  const webPolicy = /web:\s*\{\s*idleSeconds:\s*([^,]+),/.exec(auth);
  const mobilePolicy =
    /mobile:\s*\{\s*idleSeconds:\s*([^,]+),\s*maxAgeSeconds:\s*([^}]+?)\s*\}/.exec(
      auth,
    );
  if (!webPolicy || !mobilePolicy)
    throw new Error("refresh_policies não encontrado em auth.ts");

  return {
    webIdle: evaluate(webPolicy[1], []),
    mobileIdle: evaluate(mobilePolicy[1], []),
    mobileCap: evaluate(mobilePolicy[2], []),
  };
}

/** The access token's life, written as "15m" in the API config. */
function accessTokenLife(): number {
  const match = /expires_in_token:\s*"(\d+)([smhd])"/.exec(
    api("src/config/auth.ts"),
  );
  if (!match) throw new Error("expires_in_token não encontrado em auth.ts");

  const unit = { s: 1, m: 60, h: 3_600, d: 86_400 }[
    match[2] as "s" | "m" | "h" | "d"
  ];
  return Number(match[1]) * unit;
}

/**
 * How long the database backups are kept, as the API's deploy guide records
 * the Dokploy backup of the PostgreSQL Database (the only backup since
 * 2026-10-26). Dokploy keeps a count of copies ("Keep Latest"), not a period:
 * the count is a number of days only while the schedule runs once a day, so
 * the schedule is checked too. Every section of the guide that states a
 * "Keep Latest" is read, and exactly one value is accepted: two disagreeing
 * copies would make the promise ambiguous.
 */
const BACKUP_GUIDE = "docs/deploy.md";
// Tolerant of the Markdown around the value: `Keep Latest` = `30`,
// **Keep Latest:** 30 or a table row | Keep Latest | 30 |.
const BACKUP_KEEP_LATEST = /Keep Latest\W{0,16}(\d+)/g;
// A five-field cron written in code: `0 3 * * *`. Only cron characters, so
// another five-word code span in the section is not taken for a schedule.
const BACKUP_CRON = /`((?:[\d*/,-]+ ){4}[\d*/,-]+)`/g;

function backupRetentionDays(): number {
  const sections = api(BACKUP_GUIDE)
    .split(/^## /m)
    .filter((section) => section.includes("Keep Latest"));

  const kept = new Set(
    sections.flatMap((section) =>
      [...section.matchAll(BACKUP_KEEP_LATEST)].map((match) => match[1]),
    ),
  );

  if (kept.size === 0) {
    throw new Error(
      `"Keep Latest" do backup do Dokploy não encontrado em ${BACKUP_GUIDE} da API`,
    );
  }
  if (kept.size > 1) {
    throw new Error(
      `"Keep Latest" divergente em ${BACKUP_GUIDE} da API: ${[...kept].join(", ")}`,
    );
  }

  const schedules = sections.flatMap((section) =>
    [...section.matchAll(BACKUP_CRON)].map((match) => match[1]),
  );

  if (schedules.length === 0) {
    throw new Error(
      `agenda (cron) do backup não encontrada em ${BACKUP_GUIDE}`,
    );
  }

  // Once a day: fixed minute and hour, every day of every month and week.
  const notDaily = schedules.filter(
    (cron) => !/^\d{1,2} \d{1,2} \* \* \*$/.test(cron),
  );

  if (notDaily.length > 0) {
    throw new Error(
      `backup não é diário em ${BACKUP_GUIDE} (${notDaily.join(", ")}): "Keep Latest" deixa de ser um número de dias`,
    );
  }

  return Number([...kept][0]);
}

const AUTHORIZATION_QUEUE =
  "src/modules/delivery/usecases/authorize-occurrence/list-pending-authorizations-usecase.ts";
const ON_THE_WAY_RULES =
  "src/modules/route/usecases/mark-stop-on-the-way/on-the-way-rules.ts";
const PAUSE_REPORT_RULES =
  "src/modules/driver-pause/rules/pause-report-rules.ts";
const DELETE_DRIVER =
  "src/modules/driver/usecases/delete-driver/delete-driver-usecase.ts";
const DRIVER_HISTORY_REFUSAL =
  "src/modules/driver/usecases/errors/driver-history-refusal.ts";
const DELETE_BUSINESS =
  "src/modules/business/usecases/delete-business/delete-business-usecase.ts";
const BUSINESS_REPOSITORY =
  "src/modules/business/repositories/business-repository.ts";

const ON_THE_WAY_STORE = "features/deliveries/on-the-way-store.ts";
const PAUSE_STORE = "features/pauses/pause-store.ts";
const PROOF_FEEDBACK_STORE = "features/notifications/proof-feedback-store.ts";
const PROOF_FEEDBACK_RULES = "features/notifications/proof-feedback-rules.ts";

/** The pause report's forgotten-pause threshold, in minutes (PAUSE_LAW). */
function forgottenPauseMinutes(): number {
  const match = /forgottenPauseMinutes:\s*(\d[\d_]*)/.exec(
    api(PAUSE_REPORT_RULES),
  );
  if (!match) throw new Error("PAUSE_LAW.forgottenPauseMinutes não encontrado");

  return Number(match[1].replace(/_/g, ""));
}

const USER_HISTORY_JOB = "src/jobs/cron/cleanup-user-history-job.ts";
const PIPELINE_JOB = "src/jobs/cron/cleanup-notification-pipeline-job.ts";
const WEBHOOK_JOB = "src/jobs/cron/cleanup-webhook-deliveries-job.ts";
const WEBHOOK_RULES = "src/shared/integration/webhook-dispatch-rules.ts";
const ENV_SCHEMA = "src/schemas/env-schema/index.ts";

const FACTS: Fact[] = [
  {
    name: "trilha de posições do motorista",
    origin: "api",
    source: "src/jobs/cron/driver-position-partitions-job.ts",
    value: () =>
      days(
        constantIn(
          [api("src/jobs/cron/driver-position-partitions-job.ts")],
          "PARTITION_RETENTION_DAYS",
        ),
      ),
    stated: [
      ["privacidade", "a trilha de posições é apagada depois de §"],
      ["privacidade", "| Trilha de posições do motorista | §"],
    ],
  },
  {
    name: "notificações lidas",
    origin: "api",
    source: USER_HISTORY_JOB,
    value: () =>
      days(
        constantIn([api(USER_HISTORY_JOB)], "READ_NOTIFICATION_RETENTION_DAYS"),
      ),
    stated: [["privacidade", "| Notificações do sino | Lidas, §"]],
  },
  {
    name: "notificações não lidas",
    origin: "api",
    source: USER_HISTORY_JOB,
    value: () =>
      days(
        constantIn(
          [api(USER_HISTORY_JOB)],
          "UNREAD_NOTIFICATION_RETENTION_DAYS",
        ),
      ),
    stated: [["privacidade", "; não lidas, §"]],
  },
  {
    name: "prazo mínimo da trilha de auditoria",
    origin: "api",
    source: USER_HISTORY_JOB,
    value: () =>
      days(constantIn([api(USER_HISTORY_JOB)], "ACTIVITY_MIN_RETENTION_DAYS")),
    stated: [["privacidade", "ele é de no mínimo §"]],
  },
  {
    name: "registros de envio de notificações",
    origin: "api",
    source: PIPELINE_JOB,
    value: () =>
      days(constantIn([api(PIPELINE_JOB)], "PUBLISHED_RETENTION_DAYS")),
    stated: [
      [
        "privacidade",
        "com a situação informada pelo provedor | § depois do envio",
      ],
    ],
  },
  {
    name: "envios de notificação que falharam",
    origin: "api",
    source: PIPELINE_JOB,
    value: () => days(constantIn([api(PIPELINE_JOB)], "FAILED_RETENTION_DAYS")),
    stated: [["privacidade", "envios que falharam, §"]],
  },
  {
    name: "eventos de webhook guardados",
    origin: "api",
    source: WEBHOOK_JOB,
    value: () =>
      days(
        constantIn(
          [api(WEBHOOK_JOB), api(WEBHOOK_RULES)],
          "WEBHOOK_DELIVERY_RETENTION_DAYS",
        ),
      ),
    stated: [
      ["privacidade", "| Eventos enviados às integrações (webhooks) | §"],
    ],
  },
  {
    name: "janela de reenvio de webhooks",
    origin: "api",
    source: WEBHOOK_RULES,
    value: () => days(constantIn([api(WEBHOOK_RULES)], "REPLAY_WINDOW_DAYS")),
    stated: [["termos", "Cada evento pode ser reenviado por até §"]],
  },
  {
    name: "pedidos de análise por IA",
    origin: "api",
    source: "src/jobs/cron/cleanup-ai-pipeline-job.ts",
    value: () =>
      days(
        constantIn(
          [api("src/jobs/cron/cleanup-ai-pipeline-job.ts")],
          "TERMINAL_REQUEST_RETENTION_DAYS",
        ),
      ),
    stated: [
      ["privacidade", "| Pedidos de análise por IA (registro técnico) | §"],
    ],
  },
  {
    name: "link público de verificação do comprovante",
    origin: "api",
    source: `${ENV_SCHEMA} (PROOF_VERIFICATION_TTL_DAYS)`,
    value: () =>
      days(envDefault(api(ENV_SCHEMA), "PROOF_VERIFICATION_TTL_DAYS")),
    stated: [
      [
        "privacidade",
        "O link de verificação para de funcionar § depois da geração do PDF",
      ],
      ["privacidade", "| Link público de verificação do comprovante | §"],
      ["termos", "com dados pessoais do destinatário, por §"],
      ["termos", "permite abrir o PDF completo por § a partir da geração"],
    ],
  },
  {
    name: "links assinados de arquivos",
    origin: "api",
    source: `${ENV_SCHEMA} (UPLOAD_SIGNED_URL_TTL_SECONDS)`,
    value: () =>
      seconds(envDefault(api(ENV_SCHEMA), "UPLOAD_SIGNED_URL_TTL_SECONDS")),
    stated: [["privacidade", "| Links de acesso a arquivos | Expiram em §"]],
  },
  {
    name: "sessão web sem uso",
    origin: "api",
    source: "src/config/auth.ts (refresh_policies.web)",
    value: () => seconds(apiAuthPolicies().webIdle),
    stated: [
      ["privacidade", "| Sessão no painel web | Até § sem uso"],
      ["cookies", "| Até § depois do último uso da plataforma"],
    ],
  },
  {
    name: "token de acesso",
    origin: "api",
    source: "src/config/auth.ts (expires_in_token)",
    value: () => seconds(accessTokenLife()),
    stated: [["cookies", "O token dentro dele vale §"]],
  },
  {
    name: "sessão do app sem uso",
    origin: "api",
    source: "src/config/auth.ts (refresh_policies.mobile)",
    value: () => seconds(apiAuthPolicies().mobileIdle),
    stated: [["privacidade", "| Sessão no app do motorista | Até § sem uso"]],
  },
  {
    name: "teto da sessão do app",
    origin: "api",
    source: "src/config/auth.ts (refresh_policies.mobile)",
    value: () => seconds(apiAuthPolicies().mobileCap),
    stated: [["privacidade", "no máximo § desde a entrada"]],
  },
  {
    name: "cópias de segurança do banco (diárias, as mais recentes)",
    origin: "api",
    source: "docs/deploy.md (backup do Dokploy: Keep Latest e agenda diária)",
    value: () => days(backupRetentionDays()),
    stated: [
      [
        "privacidade",
        "| Cópias de segurança do banco de dados | Diárias, guardadas por §",
      ],
      [
        "privacidade",
        "Cópias de segurança diárias do banco de dados, guardadas por §",
      ],
      ["termos", "expiram no ciclo delas, em até §"],
    ],
  },
  {
    name: "cópia offline das listas no celular",
    origin: "mobile",
    source: "providers/query-provider.tsx",
    value: () =>
      seconds(
        constantIn(
          [mobile("providers/query-provider.tsx")],
          "OFFLINE_CACHE_MAX_AGE",
        ) / 1000,
      ),
    stated: [
      [
        "privacidade",
        "| Cópia das listas no celular, para uso sem sinal | Até §",
      ],
      ["termos", "uma cópia das listas de trabalho de até §"],
      ["cookies", "uma cópia das listas de trabalho por até §"],
    ],
  },
  {
    name: "pedido de autorização sem resposta, escalado aos administradores",
    origin: "api",
    source: `${AUTHORIZATION_QUEUE} (ESCALATION_AFTER_MS)`,
    value: () =>
      seconds(
        constantIn([api(AUTHORIZATION_QUEUE)], "ESCALATION_AFTER_MS") / 1000,
      ),
    stated: [["privacidade", "Sem resposta em §, o pedido é escalado"]],
  },
  {
    name: 'idade máxima de uma marcação de "a caminho" que ainda avisa o destinatário',
    origin: "api",
    source: `${ON_THE_WAY_RULES} (CUSTOMER_NOTICE_MAX_AGE_MS)`,
    value: () =>
      seconds(
        constantIn([api(ON_THE_WAY_RULES)], "CUSTOMER_NOTICE_MAX_AGE_MS") /
          1000,
      ),
    stated: [
      ["privacidade", "a marcação chega à plataforma em até § depois do toque"],
    ],
  },
  {
    name: "pausa esquecida, fora dos cálculos do relatório",
    origin: "api",
    source: `${PAUSE_REPORT_RULES} (PAUSE_LAW.forgottenPauseMinutes)`,
    value: () => seconds(forgottenPauseMinutes() * 60),
    stated: [["privacidade", "pausas esquecidas (abertas por mais de §"]],
  },
  {
    name: 'marcações de "a caminho" vencidas no celular',
    origin: "mobile",
    source: `${ON_THE_WAY_STORE} (MARK_TTL_MS)`,
    value: () =>
      seconds(constantIn([mobile(ON_THE_WAY_STORE)], "MARK_TTL_MS") / 1000),
    stated: [
      [
        "privacidade",
        '| Marcações de "a caminho" confirmadas, no celular | As de mais de §',
      ],
    ],
  },
  {
    name: "avisos da leitura do comprovante e marcações de comprovante novo vencidos no celular",
    origin: "mobile",
    source: `${PROOF_FEEDBACK_RULES} (PROOF_FEEDBACK_TTL_MS)`,
    value: () =>
      seconds(
        constantIn([mobile(PROOF_FEEDBACK_RULES)], "PROOF_FEEDBACK_TTL_MS") /
          1000,
      ),
    stated: [
      [
        "privacidade",
        "| Avisos da leitura automática do comprovante, no celular | Os de mais de §",
      ],
      ["privacidade", "As marcações dos comprovantes enviados com mais de §"],
    ],
  },
  {
    name: "intervalo das posições durante a rota",
    origin: "mobile",
    source: "features/tracking/position-rules.ts",
    value: () =>
      seconds(
        constantIn(
          [mobile("features/tracking/position-rules.ts")],
          "PING_INTERVAL_MS",
        ) / 1000,
      ),
    stated: [["privacidade", "uma posição a cada §"]],
  },
  {
    name: "cookie tfc",
    origin: "web",
    source: "src/lib/two-factor-challenge.ts",
    value: () =>
      seconds(
        constantIn(
          [web("src/lib/two-factor-challenge.ts")],
          "CHALLENGE_MAX_AGE_SECONDS",
        ),
      ),
    stated: [["cookies", "com a verificação em duas etapas ligada | §"]],
  },
  {
    name: "cookie sidebar:state",
    origin: "web",
    source: "src/components/ui/sidebar.tsx",
    value: () =>
      seconds(
        constantIn(
          [web("src/components/ui/sidebar.tsx")],
          "SIDEBAR_COOKIE_MAX_AGE",
        ),
      ),
    stated: [["cookies", "sem ele, o menu começa aberto | §"]],
  },
  {
    name: "prazo de resposta ao titular",
    origin: "lei",
    source: "LGPD, art. 19, II",
    value: () => "15 dias",
    stated: [["privacidade", "é respondida em até § (art. 19, II)"]],
  },
  {
    name: "idade mínima dos usuários",
    origin: "lei",
    source: "Código Civil, art. 5º (maioridade)",
    value: () => "18 anos",
    stated: [["privacidade", "não se destina a menores de §"]],
  },
];

describe("the legal documents are published", () => {
  // The footer and the sign-in forms link to every registered document; a
  // draft is a 404 in every build, so those links would land nowhere.
  it("serves every registered document in a production build", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getLegalDocuments().map((doc) => doc.slug)).toEqual(
      LEGAL_DOCUMENTS.map((doc) => doc.slug),
    );

    for (const { slug } of LEGAL_DOCUMENTS) {
      expect(getLegalDocument(slug), `/legal/${slug}`).not.toBeNull();
    }
  });
});

describe("every period in the texts is the one the code enforces", () => {
  for (const fact of FACTS) {
    const title =
      fact.origin === "lei"
        ? `${fact.name} (${fact.source})`
        : `${fact.name} (trajetto-${fact.origin === "web" ? "ui" : fact.origin}/${fact.source})`;

    // Skipped, and reported as skipped, when the repository is not checked out.
    it.skipIf(!AVAILABLE[fact.origin])(title, () => {
      const expected = fact.value();

      for (const [slug, template] of fact.stated) {
        const places = statedAt(slug, template);

        expect(
          places.length,
          `${slug}.mdx não diz mais "${template}"`,
        ).toBeGreaterThan(0);

        for (const place of places) {
          expect(place.value, `${slug}.mdx: "${template}"`).toBe(expected);
        }
      }
    });
  }

  // The other half: a period written anywhere else (a new paragraph repeating
  // one, a clause in the Terms) would go unchecked. Every duration a reader
  // sees has to be one of the places above.
  it("has no period without a source", () => {
    for (const slug of SLUGS) {
      const sourced = new Set(
        FACTS.flatMap((fact) =>
          fact.stated
            .filter(([doc]) => doc === slug)
            .flatMap(([, template]) =>
              statedAt(slug, template).map((place) => place.index),
            ),
        ),
      );

      const content = text(slug);
      const unsourced = durationsIn(slug)
        .filter((mention) => !sourced.has(mention.index))
        .map(
          (mention) =>
            `"…${content.slice(Math.max(0, mention.index - 60), mention.index + 20)}…"`,
        );

      expect(
        unsourced,
        `${slug}.mdx: prazo sem fonte no código (acrescente-o a FACTS)`,
      ).toEqual([]);
    }
  });
});

describe("the session cookies", () => {
  it("have the attributes the code sets", () => {
    const session = web("src/lib/session-cookie-options.ts");
    const challenge = web("src/lib/two-factor-challenge.ts");

    const sameSite = (source: string) => {
      const match = /sameSite:\s*"(\w+)"/.exec(source);
      if (!match) throw new Error("sameSite não encontrado");
      return match[1].charAt(0).toUpperCase() + match[1].slice(1);
    };

    for (const name of ["tkey", "rkey"]) {
      const row = rowOf("cookies", `<CookieName>${name}</CookieName>`);
      expect(row).toContain(`SameSite=${sameSite(session)}`);
      expect(row).toContain("HttpOnly");
    }

    const tfc = rowOf("cookies", "<CookieName>tfc</CookieName>");
    expect(tfc).toContain(`SameSite=${sameSite(challenge)}`);
    expect(tfc).toContain("HttpOnly");
  });
});

describe("what the browser keeps", () => {
  it("names the identifiers the auth store persists", () => {
    const store = web("src/store/auth-store.ts");

    // Without `partialize` the whole state goes to localStorage.
    const partialize = /partialize:\s*\(\w+\)\s*=>\s*\(\{([^}]*)\}\)/.exec(
      store,
    );
    const persisted = partialize
      ? partialize[1]
      : (/interface AuthState \{([\s\S]*?)\n\}/.exec(store)?.[1] ?? "");
    const persistsIds =
      /(?:^|[\s,{])id\??\s*:/m.test(persisted) &&
      /\bbusinessId\??\s*:/.test(persisted);

    const leaveSession = /function leaveSession[\s\S]*?\n\}/.exec(
      web("src/lib/clear-session-state.ts"),
    )?.[0];
    const clearedOnLogout = /useAuthStore\.persist\.clearStorage\(\)/.test(
      leaveSession ?? "",
    );

    const row = rowOf("cookies", "Identificador do usuário e da empresa");

    expect(row).toContain("`auth-store`");
    expect(
      persistsIds,
      "a linha cita identificadores que o auth-store não guarda",
    ).toBe(true);
    expect(row.includes("Apagado ao sair da conta")).toBe(clearedOnLogout);
  });

  it("says whether the resend timer's key carries the e-mail and outlives the logout", () => {
    // The key moved to resend-cooldown.ts (PUB-27); both files are read, so a
    // per-account key written from either one keeps the row honest.
    const hookFiles = [
      web("src/components/auth/two-factor-authentication-form/hooks/index.ts"),
      web(
        "src/components/auth/two-factor-authentication-form/hooks/resend-cooldown.ts",
      ),
    ];
    const logout = web("src/lib/clear-session-state.ts");

    const keyCarriesEmail = hookFiles.some(
      (source) =>
        /localStorage\.setItem\(\s*`[^`]*\$\{/.test(source) ||
        /RESEND_COOLDOWN_KEY\s*=\s*`[^`]*\$\{/.test(source) ||
        /localStorage\.setItem\([^)]*\bemail\b/.test(source),
    );
    const fixedKey = hookFiles
      .map((source) => /RESEND_COOLDOWN_KEY\s*=\s*"([^"]+)"/.exec(source)?.[1])
      .find(Boolean);
    const clearedOnLogout =
      /lastResendTime|trajetto:2fa-resend-at|RESEND_COOLDOWN_KEY/.test(logout);

    const row = rowOf(
      "cookies",
      "Horário do último reenvio do código de verificação",
    );
    const cookiesText = text("cookies");

    expect(
      row.includes("e-mail da conta"),
      "a linha deve dizer se a chave leva o e-mail",
    ).toBe(keyCarriesEmail);
    expect(
      cookiesText.includes("o e-mail no nome da entrada"),
      "a seção 6 deve dizer se a chave leva o e-mail",
    ).toBe(keyCarriesEmail);
    if (fixedKey)
      expect(row, "a linha deve citar a chave fixa").toContain(fixedKey);
    expect(row.includes("Continua depois de sair da conta")).toBe(
      !clearedOnLogout,
    );
    expect(cookiesText.includes("não identificam ninguém")).toBe(false);
  });

  it("describes sidebar:state as unread while nothing reads it", () => {
    const readers = codeFiles(
      resolve(ROOT, "src"),
      (rel) => rel === "src/content",
    )
      .map((file) => [file, readFileSync(file, "utf8")] as const)
      .flatMap(([file, source]) =>
        source
          .split("\n")
          .filter((line) => /sidebar:state|SIDEBAR_COOKIE_NAME/.test(line))
          // The declaration and the one write are not reads.
          .filter((line) => !/const SIDEBAR_COOKIE_NAME\s*=/.test(line))
          .filter(
            (line) =>
              !/document\.cookie\s*=\s*`\$\{SIDEBAR_COOKIE_NAME\}=/.test(line),
          )
          .map((line) => `${relative(ROOT, file)}: ${line.trim()}`),
      );

    const row = rowOf("cookies", "<CookieName>sidebar:state</CookieName>");

    expect(
      row.includes("a plataforma não lê esse cookie"),
      readers.join("\n"),
    ).toBe(readers.length === 0);
  });
});

describe("what the driver app keeps on the phone", () => {
  it.skipIf(!HAS_MOBILE)(
    "keeps only session tokens in secure storage (trajetto-mobile/utils/storage.ts)",
    () => {
      const secureUsers = mobileCode()
        .filter((file) => /\bSecureStore\./.test(readFileSync(file, "utf8")))
        .map((file) => relative(MOBILE, file).replace(/\\/g, "/"));

      const keys =
        /const SECURE_KEYS = \{([\s\S]*?)\}/.exec(
          mobile("utils/storage.ts"),
        )?.[1] ?? "";
      const values = [...keys.matchAll(/:\s*"([^"]+)"/g)].map(
        (match) => match[1],
      );

      // The proof's device identity (proof design §8.1): an installation id
      // kept beside the tokens when the Android ID cannot be read.
      const IDENTITY = "features/device/device-identity.ts";
      const keepsInstallationId =
        existsSync(resolve(MOBILE, IDENTITY)) &&
        /INSTALLATION_ID_KEY\s*=\s*"device-installation-id"/.test(
          mobile(IDENTITY),
        ) &&
        /SecureStore\.setItemAsync\(INSTALLATION_ID_KEY/.test(mobile(IDENTITY));

      expect(secureUsers.sort()).toEqual(
        keepsInstallationId
          ? [IDENTITY, "utils/storage.ts"]
          : ["utils/storage.ts"],
      );
      // The current session and the two legacy token keys it migrates from.
      expect(values.sort()).toEqual(["rkey", "session_v1", "tkey"]);

      const INSTALLATION =
        "um código de instalação do app, que identifica o celular no PDF do comprovante";

      if (keepsInstallationId) {
        expect(text("privacidade")).toContain(
          `no armazenamento seguro do Android, os tokens da sessão e, quando o Android não fornece o identificador do aparelho, ${INSTALLATION}. São os únicos itens guardados ali`,
        );
        expect(text("cookies")).toContain(
          `no armazenamento seguro do Android, que guarda só os tokens da sessão e, quando o Android não fornece o identificador do aparelho, ${INSTALLATION}`,
        );
        // It names the phone, not the driver: a logout keeps it.
        expect(text("privacidade")).toContain(
          "assim como o código de instalação do app, que identifica o celular e não o motorista",
        );
        expect(text("cookies")).toContain(
          "assim como os arquivos do cache do app e o código de instalação do app",
        );
      } else {
        expect(text("privacidade")).toContain(
          "os tokens da sessão, no armazenamento seguro do Android. Eles são o único item guardado ali",
        );
        expect(text("cookies")).toContain(
          "os tokens da sessão, no armazenamento seguro do Android, que guarda só eles",
        );
      }
    },
  );

  /**
   * Every key the app writes to the phone's storage (AsyncStorage), what the
   * two texts say it holds, and the name the logout paragraphs use for it
   * (null: a technical marker the logout paragraphs do not name). A prefix
   * entry covers every key under it.
   */
  interface PhoneKey {
    key: string;
    prefix?: true;
    holds: string | RegExp;
    label: string | null;
  }

  const PHONE_KEYS: PhoneKey[] = [
    {
      key: "auth-store",
      holds:
        /uma cópia do (?:seu )?perfil \(nome, e-mail, papel, empresa e permissões\)/,
      label: "o perfil",
    },
    {
      key: "two-factor-store",
      holds: "o e-mail da conta e o horário do último reenvio do código",
      label: "o e-mail da verificação",
    },
    {
      key: "@trajetto:react-query:offline-v1",
      holds: "uma cópia das listas de trabalho",
      label: "a cópia das listas",
    },
    {
      // Drafts, their submission ids and the camera's pending-capture marker.
      key: "@trajetto:submission:",
      prefix: true,
      holds: "os formulários começados e ainda não enviados",
      label: "os formulários não enviados",
    },
    {
      key: "@trajetto:outbox:v1",
      holds: "a fila de registros confirmados sem sinal",
      label: "a fila",
    },
    {
      key: "driver_position_state",
      holds:
        "as posições da rota ainda não enviadas ao servidor e a última posição guardada, com a identificação do motorista a quem pertencem",
      label: "as posições pendentes da rota",
    },
    {
      key: "@trajetto:driver-pause:v1",
      holds:
        "a pausa em andamento (tipo, início, observação e local) e o toque de início ou de fim ainda não enviado nem posto na fila",
      label: "a pausa em andamento",
    },
    {
      key: "@trajetto:on-the-way:v1",
      holds:
        'as marcações de "a caminho" já confirmadas (parada, rota e horário)',
      label: 'as marcações de "a caminho"',
    },
    {
      key: "@trajetto:proof-feedback:v1",
      holds:
        "os avisos da leitura automática do comprovante (a entrega e o texto do aviso, com o nome do destinatário e o problema apontado)",
      label: "os avisos da leitura automática do comprovante",
    },
    {
      // A device preference: the logout leaves it, like the phone's own setting.
      key: "theme-preference",
      holds: "a preferência de tema do app (claro, escuro ou o do sistema)",
      label: null,
    },
    {
      key: "driver_background_location_asked",
      holds:
        "a de que a permissão de localização em segundo plano já foi pedida",
      label: null,
    },
    {
      key: "@trajetto:splash-seen:",
      prefix: true,
      holds: "a de que a animação de abertura já foi exibida",
      label: null,
    },
    {
      key: "auth_logged_out",
      holds: "a de que a sessão foi encerrada neste aparelho",
      label: null,
    },
  ];

  interface PhoneWrite {
    key: string;
    prefix: boolean;
    file: string;
  }

  const mobileRel = (file: string) =>
    relative(MOBILE, file).replace(/\\/g, "/");

  /** The submission prefix every draft key is made under. */
  function submissionPrefix(): string {
    const submissions = mobile("features/submissions/submission-id.ts");
    const prefix = /const SUBMISSION_STORAGE_PREFIX = "([^"]+)"/.exec(
      submissions,
    )?.[1];
    if (!prefix) throw new Error("SUBMISSION_STORAGE_PREFIX não encontrado");

    // The two key makers the drafts use (checklist and fuel, then deliveries).
    expect(submissions).toMatch(
      new RegExp(
        String.raw`function createSubmissionStorageKey[\s\S]*?return \`${escapeRegExp(prefix)}`,
      ),
    );
    expect(mobile("features/deliveries/delivery-draft-rules.ts")).toMatch(
      new RegExp(
        String.raw`function deliveryDraftKey[\s\S]*?return \`${escapeRegExp(prefix)}`,
      ),
    );

    return prefix;
  }

  /**
   * A write's key argument that is a parameter: the key is made elsewhere.
   * null for a wrapper whose callers are scanned themselves.
   */
  function passThrough(
    file: string,
    argument: string,
  ): { key: string; prefix: boolean } | null | undefined {
    const PASS_THROUGH: Record<
      string,
      Record<string, () => { key: string; prefix: boolean } | null>
    > = {
      // The JSON wrapper: its callers are scanned as `asyncStorage.setItem(`.
      "utils/storage.ts": { key: () => null },
      // The zustand adapter: the key is the store's persist name.
      [PROOF_FEEDBACK_STORE]: { name: () => null },
      // Submission ids and drafts, under keys made by the two makers above.
      "features/submissions/submission-id.ts": {
        storageKey: () => ({ key: submissionPrefix(), prefix: true }),
      },
      "features/submissions/draft-store.ts": {
        "metadataKey(submissionStorageKey)": () => ({
          key: submissionPrefix(),
          prefix: true,
        }),
      },
    };

    const resolve = PASS_THROUGH[file]?.[argument];

    return resolve ? resolve() : undefined;
  }

  /** The first argument of a call, up to its first top-level comma or `)`. */
  function firstArgument(source: string, from: number): string {
    let depth = 0;
    let quote: string | null = null;

    for (let index = from; index < source.length; index += 1) {
      const char = source[index];

      if (quote) {
        if (char === quote && source[index - 1] !== "\\") quote = null;
        continue;
      }

      if (char === '"' || char === "'" || char === "`") quote = char;
      else if ("([{".includes(char)) depth += 1;
      else if (")]}".includes(char)) {
        if (depth === 0) return source.slice(from, index).trim();
        depth -= 1;
      } else if (char === "," && depth === 0)
        return source.slice(from, index).trim();
    }

    throw new Error("argumento sem fim");
  }

  /**
   * Every key the app writes to AsyncStorage: the zustand stores' persist
   * names, the query persister's key and every `setItem` (direct or through
   * the JSON wrapper), each key argument resolved to a literal, a template's
   * fixed prefix, a constant or ASYNC_KEYS. A key the test cannot read fails.
   */
  function phoneWrites(): PhoneWrite[] {
    const asyncKeys = Object.fromEntries(
      [
        ...(
          /const ASYNC_KEYS = \{([\s\S]*?)\}/.exec(
            mobile("utils/storage.ts"),
          )?.[1] ?? ""
        ).matchAll(/(\w+):\s*"([^"]+)"/g),
      ].map((match) => [match[1], match[2]]),
    );

    return mobileCode().flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const file = mobileRel(path);
      const writes: PhoneWrite[] = [];

      // A persist name is a literal or a constant of the same file (the theme
      // store exports its key for its tests); a version may sit before storage.
      const persistNames = [
        ...source.matchAll(
          /\bname:\s*(?:"([^"]+)"|([A-Z][A-Z0-9_]*)),\s*(?:version:\s*\d+,\s*)?storage:\s*createJSONStorage/g,
        ),
      ].map((match) => {
        if (match[1]) return match[1];

        const value = new RegExp(
          String.raw`\bconst ${match[2]}\s*=\s*"([^"]+)"`,
        ).exec(source)?.[1];
        if (!value)
          throw new Error(
            `${file}: nome de store que o teste não sabe ler: ${match[2]}`,
          );
        return value;
      });

      if (
        /from "zustand\/middleware"/.test(source) &&
        /\bpersist\(/.test(source)
      ) {
        expect(
          persistNames.length,
          `${file}: store persistido sem nome legível`,
        ).toBeGreaterThan(0);
      }

      for (const key of persistNames) writes.push({ key, prefix: false, file });

      for (const match of source.matchAll(
        /createAsyncStoragePersister\(\{[\s\S]*?\bkey:\s*"([^"]+)"/g,
      )) {
        writes.push({ key: match[1], prefix: false, file });
      }

      for (const call of source.matchAll(
        /\b(?:AsyncStorage|asyncStorage)\.(?:setItem|multiSet|mergeItem)\(\s*/g,
      )) {
        const argument = firstArgument(
          source,
          (call.index ?? 0) + call[0].length,
        );

        const literal = /^"([^"]+)"$/.exec(argument);
        const template = /^`([^`$]+)\$\{/.exec(argument);
        const member = /^ASYNC_KEYS\.(\w+)$/.exec(argument);
        const constant = /^\w+$/.test(argument)
          ? new RegExp(
              String.raw`\bconst ${argument}\s*=\s*(?:"([^"]+)"|\`([^\`$]+)\$\{)`,
            ).exec(source)
          : null;

        if (literal) writes.push({ key: literal[1], prefix: false, file });
        else if (template)
          writes.push({ key: template[1], prefix: true, file });
        else if (member && asyncKeys[member[1]])
          writes.push({ key: asyncKeys[member[1]], prefix: false, file });
        else if (constant?.[1])
          writes.push({ key: constant[1], prefix: false, file });
        else if (constant?.[2])
          writes.push({ key: constant[2], prefix: true, file });
        else {
          const resolved = passThrough(file, argument);

          if (resolved === undefined) {
            throw new Error(
              `${file}: chave de armazenamento que o teste não sabe ler: ${argument}`,
            );
          }
          if (resolved) writes.push({ ...resolved, file });
        }
      }

      return writes;
    });
  }

  const covers = (entry: PhoneKey, write: { key: string; prefix: boolean }) =>
    entry.prefix
      ? write.key.startsWith(entry.key)
      : !write.prefix && write.key === entry.key;

  it.skipIf(!HAS_MOBILE)(
    "describes every key the app writes to the phone's storage (trajetto-mobile, AsyncStorage)",
    () => {
      const writes = phoneWrites();

      for (const write of writes) {
        expect(
          PHONE_KEYS.some((entry) => covers(entry, write)),
          `${write.file}: chave ${write.key}${write.prefix ? "…" : ""} sem descrição nas políticas (acrescente-a a PHONE_KEYS)`,
        ).toBe(true);
      }

      for (const entry of PHONE_KEYS) {
        expect(
          writes.some((write) => covers(entry, write)),
          `${entry.key} não é mais gravada pelo app: tire-a das políticas e de PHONE_KEYS`,
        ).toBe(true);
      }

      const sections = {
        privacidade: sectionOf("privacidade", "## 8."),
        cookies: sectionOf("cookies", "## 5."),
      };

      for (const [slug, section] of Object.entries(sections)) {
        for (const { key, holds } of PHONE_KEYS) {
          if (typeof holds === "string")
            expect(section, `${slug}.mdx: ${key}`).toContain(holds);
          else expect(section, `${slug}.mdx: ${key}`).toMatch(holds);
        }
      }
    },
  );

  // The occurrence draft keeps the form's answers as typed (decision 6.2):
  // the drafts bullet names them exactly while the draft has the field.
  it.skipIf(!HAS_MOBILE)(
    "says whether an occurrence draft keeps the form's answers (trajetto-mobile/features/deliveries/delivery-draft-rules.ts)",
    () => {
      const draft = blockAfter(
        mobile("features/deliveries/delivery-draft-rules.ts"),
        "interface OccurrenceDraft {",
      );
      const keepsAnswers = /\banswers\??:/.test(draft);

      for (const section of [
        sectionOf("privacidade", "## 8."),
        sectionOf("cookies", "## 5."),
      ]) {
        expect(
          section.includes("e as respostas do formulário da ocorrência"),
        ).toBe(keepsAnswers);
      }
    },
  );

  /**
   * What the logout itself removes: only what `logout` in the auth store
   * calls (a `persist.clearStorage()` elsewhere in the app is not a logout).
   */
  function erasedOnLogout(): (entry: PhoneKey) => boolean {
    const logout = blockAfter(
      mobile("store/auth-store.ts"),
      "logout: async () => {",
    );
    const storage = mobile("utils/storage.ts");
    const erased: Array<{ key: string; prefix: boolean }> = [];

    const asyncKeys = Object.fromEntries(
      [
        ...(
          /const ASYNC_KEYS = \{([\s\S]*?)\}/.exec(storage)?.[1] ?? ""
        ).matchAll(/(\w+):\s*"([^"]+)"/g),
      ].map((match) => [match[1], match[2]]),
    );

    if (/authSessionStorage\.clearPersistedAuth\(\)/.test(logout)) {
      const clearAuth = blockAfter(
        storage,
        /async clearPersistedAuth\(\)[^{]*\{/,
      );

      for (const match of clearAuth.matchAll(/ASYNC_KEYS\.(\w+)/g)) {
        erased.push({ key: asyncKeys[match[1]], prefix: false });
      }
    }

    if (/\bclearAllSubmissionData\(\)/.test(logout)) {
      const sweep = blockAfter(
        mobile("features/submissions/submission-id.ts"),
        /function clearAllSubmissionData\(\)[^{]*\{/,
      );

      expect(sweep, "clearAllSubmissionData não varre mais o prefixo").toMatch(
        /startsWith\(SUBMISSION_STORAGE_PREFIX\)[\s\S]*multiRemove/,
      );
      erased.push({ key: submissionPrefix(), prefix: true });
    }

    if (/\bclearQueryCache\(\)/.test(logout)) {
      const provider = mobile("providers/query-provider.tsx");
      const clear = blockAfter(provider, /function clearQueryCache\(\)[^{]*\{/);
      const key =
        /createAsyncStoragePersister\(\{[\s\S]*?\bkey:\s*"([^"]+)"/.exec(
          provider,
        )?.[1];

      if (key && /queryPersister\.removeClient\(\)/.test(clear))
        erased.push({ key, prefix: false });
    }

    for (const match of logout.matchAll(/(\w+)\.persist\.clearStorage\(\)/g)) {
      const name = persistNameOf(match[1]);

      if (name) erased.push({ key: name, prefix: false });
    }

    // A helper that wipes a store (`clearProofFeedbackStore`), called from
    // the logout, erases that store as well.
    for (const wiper of storeWipers()) {
      if (new RegExp(String.raw`\b${wiper.helper}\(`).test(logout))
        erased.push({ key: wiper.key, prefix: false });
    }

    return (entry) => erased.some((wiped) => covers(entry, wiped));
  }

  /** The persist name of the zustand store bound to `store` (`const X = create<`). */
  function persistNameOf(store: string): string | undefined {
    const file = mobileCode().find((path) =>
      new RegExp(String.raw`const ${store} = create<`).test(
        readFileSync(path, "utf8"),
      ),
    );

    return file
      ? /\bname:\s*"([^"]+)",\s*storage:\s*createJSONStorage/.exec(
          readFileSync(file, "utf8"),
        )?.[1]
      : undefined;
  }

  /** Every function of the app that wipes a persisted store, and the store's key. */
  function storeWipers(): Array<{ helper: string; key: string; file: string }> {
    return mobileCode().flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const file = mobileRel(path);

      return [
        ...source.matchAll(/(?:async\s+)?function (\w+)\([^)]*\)[^{]*\{/g),
      ].flatMap((opening) => {
        const helperBody = blockAfter(
          source.slice(opening.index ?? 0),
          opening[0],
        );
        const store = /(\w+)\.persist\.clearStorage\(\)/.exec(helperBody)?.[1];
        if (!store) return [];

        const key = persistNameOf(store);
        if (!key)
          throw new Error(
            `${file}: ${opening[1]} apaga um store sem nome legível`,
          );

        return [{ helper: opening[1], key, file }];
      });
    });
  }

  // A store the texts say outlives the logout must not be wiped anywhere
  // else either: a wipe on a session change, a timer or a screen would make
  // the retention rows wrong. Only the logout (read above) may call a wiper.
  it.skipIf(!HAS_MOBILE)(
    "knows every place that wipes a persisted store (trajetto-mobile, persist.clearStorage)",
    () => {
      const authStore = mobile("store/auth-store.ts");
      const logout = blockAfter(authStore, "logout: async () => {");
      const wipers = storeWipers();
      const count = (source: string, pattern: RegExp) =>
        [...source.matchAll(pattern)].length;

      for (const wiper of wipers) {
        // Calls, not the definition, the imports or the export list.
        const call = new RegExp(
          String.raw`(?<!function )\b${wiper.helper}\(`,
          "g",
        );
        const outsideLogout = mobileCode()
          .map((path) => [mobileRel(path), readFileSync(path, "utf8")] as const)
          .filter(([file, source]) =>
            file === "store/auth-store.ts"
              ? count(source, call) > count(logout, call)
              : count(source, call) > 0,
          )
          .map(([file]) => file);

        expect(
          outsideLogout,
          `${wiper.helper} (${wiper.key}) passou a ser chamada fora do logout: diga nos textos quando isso apaga o que ela guarda`,
        ).toEqual([]);
      }

      // Every other wipe is the logout's own, which erasedOnLogout reads.
      const clear = /\.persist\.clearStorage\(\)/g;
      const unknown = mobileCode()
        .map((path) => [mobileRel(path), readFileSync(path, "utf8")] as const)
        .filter(([file]) => file !== "store/auth-store.ts")
        .filter(
          ([file, source]) =>
            count(source, clear) >
            wipers.filter((wiper) => wiper.file === file).length,
        )
        .map(([file]) => file);

      expect(
        unknown,
        "persist.clearStorage() fora de uma função que o teste conhece",
      ).toEqual([]);
      expect(
        count(authStore, clear),
        "persist.clearStorage() no auth-store fora do logout",
      ).toBe(count(logout, clear));
    },
  );

  /** A paragraph's first sentence, and the rest of it. */
  function logoutParagraph(
    slug: Slug,
    opening: string,
  ): { erasing: string; rest: string } {
    const paragraphs = body(slug)
      .split(/\n\s*\n/)
      .map((block) => block.replace(/\s+/g, " ").trim())
      .filter((block) => block.startsWith(opening));

    expect(
      paragraphs,
      `${slug}.mdx: o parágrafo que começa com "${opening}"`,
    ).toHaveLength(1);

    const end = paragraphs[0].indexOf(".") + 1;

    return {
      erasing: paragraphs[0].slice(0, end).toLowerCase(),
      rest: paragraphs[0].slice(end).toLowerCase(),
    };
  }

  // What stays on purpose (per driver, or until the owner's next sign-in) and
  // what the logout wipes: a text saying "sair da conta apaga" about the
  // former, or silent about what stays, would be wrong about the phone.
  it.skipIf(!HAS_MOBILE)(
    "says which of them the logout erases and which stay on the phone (trajetto-mobile/store/auth-store.ts, logout)",
    () => {
      const erased = erasedOnLogout();

      expect(
        PHONE_KEYS.some(erased),
        "nada apagado ao sair: a detecção quebrou",
      ).toBe(true);

      const OPENING = {
        privacidade: "Sair da conta apaga do aparelho",
        cookies: "Sair da conta apaga a sessão",
      } as const;

      for (const slug of ["privacidade", "cookies"] as const) {
        const { erasing, rest } = logoutParagraph(slug, OPENING[slug]);

        for (const entry of PHONE_KEYS) {
          if (!entry.label) continue;

          const wiped = erased(entry);

          expect(
            erasing.includes(entry.label),
            `${slug}.mdx: "${entry.label}" na frase do que sair da conta apaga`,
          ).toBe(wiped);
          expect(
            rest.includes(entry.label),
            `${slug}.mdx: "${entry.label}" no que continua no aparelho`,
          ).toBe(!wiped);
        }
      }
    },
  );

  /**
   * The persisted fields of the three stores kept across a logout, and
   * whether each is kept per driver (written under `[scope]`) or shared by
   * the phone. A field the store adds fails until it is placed here.
   */
  const KEPT_FIELDS: Record<
    string,
    { file: string; fields: Record<string, "por motorista" | "comum"> }
  > = {
    "@trajetto:driver-pause:v1": {
      file: PAUSE_STORE,
      fields: { byScope: "por motorista", handoffs: "por motorista" },
    },
    "@trajetto:on-the-way:v1": {
      file: ON_THE_WAY_STORE,
      fields: { byScope: "por motorista" },
    },
    "@trajetto:proof-feedback:v1": {
      file: PROOF_FEEDBACK_STORE,
      fields: { byScope: "por motorista", newProofs: "comum" },
    },
  };

  /** How the texts name a field the phone shares between drivers. */
  const SHARED_LABELS: Record<string, string> = {
    "@trajetto:proof-feedback:v1.newProofs":
      "as marcações dos comprovantes enviados",
  };

  it.skipIf(!HAS_MOBILE)(
    "says which records on the phone are kept per driver and which are shared (trajetto-mobile, persisted stores)",
    () => {
      const erased = erasedOnLogout();

      for (const [name, { file, fields }] of Object.entries(KEPT_FIELDS)) {
        const source = mobile(file);
        const entry = PHONE_KEYS.find((key) => key.key === name);

        expect(source, `${file}: ${name}`).toContain(`name: "${name}"`);
        expect(entry, `${name} sem entrada em PHONE_KEYS`).toBeDefined();

        // A store the logout wipes keeps nothing shared across a sign-out.
        const kept = !erased(entry as PhoneKey);

        const partialize = /partialize:\s*\(\w+\)\s*=>\s*\(\{([^}]*)\}\)/.exec(
          source,
        )?.[1];
        if (!partialize) throw new Error(`${file}: partialize não encontrado`);

        const persisted = [...partialize.matchAll(/(\w+):/g)]
          .map((match) => match[1])
          .sort();

        expect(
          persisted,
          `${file}: campo persistido novo (acrescente-o a KEPT_FIELDS)`,
        ).toEqual(Object.keys(fields).sort());

        for (const [field, scope] of Object.entries(fields)) {
          const perDriver = new RegExp(
            String.raw`\b${field}:\s*\{\s*\.\.\.state\.${field},\s*\[scope\]:`,
          ).test(source);

          expect(
            perDriver,
            `${file}: ${field} ${scope === "comum" ? "passou a ser" : "deixou de ser"} gravado por motorista`,
          ).toBe(scope === "por motorista");

          if (scope === "comum") {
            const label = SHARED_LABELS[`${name}.${field}`];

            expect(
              label,
              `${name}.${field}: campo comum sem nome nas políticas`,
            ).toBeDefined();
            expect(
              logoutParagraph(
                "privacidade",
                "Sair da conta apaga do aparelho",
              ).rest.includes(
                `${label} ficam num registro único do aparelho, sem separação por motorista`,
              ),
              `privacidade.mdx: ${label} ${kept ? "continuam" : "saem"} ao sair da conta`,
            ).toBe(kept);
            expect(
              logoutParagraph(
                "cookies",
                "Sair da conta apaga a sessão",
              ).rest.includes(`${label} ficam sem separação por motorista`),
              `cookies.mdx: ${label} ${kept ? "continuam" : "saem"} ao sair da conta`,
            ).toBe(kept);
          }
        }
      }
    },
  );

  /**
   * What the shared mark copies from the warning held at the tap, read from
   * the object `markDeliveryProven` writes (not from a type's name): "all"
   * for the warning whole, else the fields taken from it.
   */
  function replacedCopy(proven: string): "all" | string[] {
    const bound =
      /\bconst replaced\b[^=]*=\s*([\s\S]*?);\s*\n/.exec(proven)?.[1] ??
      /\breplaced:\s*([^,}\n]+)/.exec(proven)?.[1];
    if (bound === undefined)
      throw new Error(
        "markDeliveryProven: o valor de replaced não foi encontrado",
      );

    if (
      /\.\.\.\s*held\b/.test(bound) ||
      /(?:^|[?:(,]\s*)held\s*(?:$|[:,;)])/.test(bound.trim())
    )
      return "all";

    const copied = [...bound.matchAll(/(\w+):\s*held\.\w+/g)].map(
      (match) => match[1],
    );
    const literal = /\{([^{}]*)\}/.exec(bound)?.[1] ?? "";
    // Every key of the literal, shorthand ones too (`{ at, message }`).
    const keys = literal
      .split(",")
      .map((part) => part.split(":")[0].trim())
      .filter(Boolean);

    if (copied.length === 0 || keys.some((key) => !copied.includes(key))) {
      throw new Error(
        `markDeliveryProven: replaced que o teste não sabe ler: ${bound.trim()}`,
      );
    }

    return copied.sort();
  }

  // The shared mark: the delivery, the tap and what it keeps of the warning
  // it replaces. Written at the tap, before the send; taken back when the
  // proof is refused without being queued. The texts say each exactly.
  it.skipIf(!HAS_MOBILE)(
    `says what a shared proof mark holds and when it is written (trajetto-mobile/${PROOF_FEEDBACK_RULES}, markDeliveryProven)`,
    () => {
      const rules = mobile(PROOF_FEEDBACK_RULES);
      const store = mobile(PROOF_FEEDBACK_STORE);
      const markFields = [
        ...blockAfter(rules, "interface NewProofMark {").matchAll(
          /^\s*(\w+)\??:/gm,
        ),
      ]
        .map((match) => match[1])
        .sort();

      expect(
        markFields,
        "NewProofMark: campo novo na marcação (descreva-o nos textos)",
      ).toEqual(["replaced", "tappedAt"]);

      const proven = blockAfter(
        rules,
        /function markDeliveryProven\([\s\S]*?\): ProofFeedbackState \{/,
      );
      const copy = replacedCopy(proven);
      const copiesText =
        copy === "all" || copy.includes("message") || copy.includes("title");
      // The reference the texts describe: the warning's instants and its row id.
      const REFERENCE = ["at", "notificationId", "receivedAt"];

      if (!copiesText) {
        expect(
          (copy as string[]).filter((field) => !REFERENCE.includes(field)),
          "campo novo copiado do aviso",
        ).toEqual([]);
      }

      const submitProof = blockAfter(
        mobile("features/deliveries/hooks/use-delivery-actions.ts"),
        /const submitProof = async \([\s\S]*?\): Promise<boolean> => \{/,
      );
      const markAt = submitProof.indexOf("markDeliveryProofSubmitted(");
      const marksAtTap =
        markAt >= 0 && markAt < submitProof.indexOf("submitOrQueue(");
      const undoesOnRefusal =
        /\bunmarkProven:/.test(store) &&
        /\b(?:undo|unmarkProven)\b/.test(
          blockAfter(submitProof, /catch \(\w*\) \{/),
        );

      expect(
        markAt,
        "o comprovante deixou de marcar a entrega",
      ).toBeGreaterThanOrEqual(0);

      for (const section of [
        sectionOf("privacidade", "## 8."),
        sectionOf("cookies", "## 5."),
      ]) {
        expect(
          section.includes(
            "uma cópia do aviso que o novo comprovante substitui",
          ),
        ).toBe(copiesText);
        expect(
          section.includes(
            "uma referência ao aviso que o novo comprovante substitui: o horário e o identificador desse aviso, sem o texto",
          ),
        ).toBe(!copiesText);
        expect(section.includes('o horário do toque em "Comprovar"')).toBe(
          marksAtTap,
        );
        expect(
          section.includes('A marcação é gravada no toque em "Comprovar"'),
        ).toBe(marksAtTap);
        expect(
          section.includes(
            "desfeita se o comprovante for recusado sem ir para a fila",
          ),
        ).toBe(undoesOnRefusal);
      }
    },
  );

  // When each store lets go of what it holds: the stores prune on write, only
  // the scope written, and the pause has no clock at all. A driver who never
  // comes back leaves everything on the phone; the §10 rows say so exactly
  // while no code prunes every driver's entries.
  it.skipIf(!HAS_MOBILE)(
    "says when the phone lets go of the pause, the marks, the warnings and the positions (trajetto-mobile)",
    () => {
      const UNTIL_WIPED =
        "ficam até o app ser desinstalado ou ter os dados limpos";
      const prunesEveryScope = (source: string) =>
        /Object\.(?:entries|keys|values)\(\s*(?:state\.)?byScope\s*\)[\s\S]{0,400}?\bprune\w*\(|onRehydrateStorage|\bmigrate:/.test(
          source,
        );

      // "a caminho": pruned in `confirm`, for the scope written.
      const onTheWay = mobile(ON_THE_WAY_STORE);
      const marksOnWrite = /\[scope\]:\s*prunedMarks\(/.test(onTheWay);
      const marksRow = rowOf(
        "privacidade",
        'Marcações de "a caminho" confirmadas, no celular',
      );

      expect(
        marksOnWrite || prunesEveryScope(onTheWay),
        "a poda das marcações não foi encontrada",
      ).toBe(true);
      expect(
        marksRow.includes(
          "quando o app grava a próxima marcação do mesmo motorista",
        ),
      ).toBe(marksOnWrite && !prunesEveryScope(onTheWay));
      expect(marksRow.includes(UNTIL_WIPED)).toBe(!prunesEveryScope(onTheWay));

      // Proof warnings: `record` rewrites only its scope; `markProven` writes
      // only the shared marks and never touches a warning.
      const proof = mobile(PROOF_FEEDBACK_STORE);
      const proofRules = mobile(PROOF_FEEDBACK_RULES);
      // The implementations, not the interface's signatures of the same name:
      // an arrow straight into `set((state) => {` or a block body.
      const action = (name: string) =>
        blockAfter(
          proof,
          new RegExp(
            String.raw`\b${name}:\s*\((?:[^()]|\([^()]*\))*\)\s*=>\s*(?:set\(\(state\) =>\s*)?\{`,
          ),
        );
      const record = action("record");
      const markProven = action("markProven");
      const ruleBody = (name: string) =>
        blockAfter(
          proofRules,
          new RegExp(
            String.raw`function ${name}\([\s\S]*?\): ProofFeedbackState \{`,
          ),
        );
      const recordPrunes = /return pruneProofFeedback\(/.test(
        ruleBody("recordProofFeedback"),
      );
      const recordOwnScope =
        /byScope:\s*\{\s*\.\.\.state\.byScope,\s*\[scope\]:/.test(record);
      const newProofTouchesWarnings = /\bbyScope:/.test(markProven);
      const warningsRow = rowOf(
        "privacidade",
        "Avisos da leitura automática do comprovante, no celular",
      );
      const proofWipedOnLogout = erasedOnLogout()(
        PHONE_KEYS.find(
          (entry) => entry.key === "@trajetto:proof-feedback:v1",
        ) as PhoneKey,
      );

      expect(
        /\bnewProofs:/.test(markProven),
        "markProven não grava mais as marcações: a leitura quebrou",
      ).toBe(true);
      expect(recordPrunes, "recordProofFeedback deixou de podar").toBe(true);
      expect(
        warningsRow.includes(
          "quando o app grava o próximo aviso do mesmo motorista",
        ),
      ).toBe(
        recordOwnScope && !newProofTouchesWarnings && !prunesEveryScope(proof),
      );
      // The warnings' sentence of the cell, and the shared marks' one.
      const [warningsPart, marksPart = ""] = (
        warningsRow.split("|")[2] ?? ""
      ).split("As marcações dos comprovantes enviados");

      expect(
        /novo comprovante|comprovante novo/.test(warningsPart),
        "um comprovante novo não apaga aviso",
      ).toBe(newProofTouchesWarnings);
      // A logout that wipes them is one more way out, not a promise: a driver
      // who never signs out still leaves them until the app is wiped.
      expect(warningsPart.includes(UNTIL_WIPED)).toBe(!prunesEveryScope(proof));
      expect(warningsRow.includes("sair da conta")).toBe(proofWipedOnLogout);

      // The shared marks: pruned by age whenever the rules rewrite them, which
      // is any driver's warning (`record` keeps the rules' newProofs) and any
      // new mark; nothing else lets go of them.
      const prunesMarks =
        /Object\.entries\(state\.newProofs\)[\s\S]*?PROOF_FEEDBACK_TTL_MS/.test(
          ruleBody("pruneProofFeedback"),
        );
      const marksOnAnyWrite =
        prunesMarks &&
        recordPrunes &&
        /newProofs:\s*next\.newProofs/.test(record) &&
        /return pruneProofFeedback\(/.test(ruleBody("markDeliveryProven"));

      expect(
        marksPart,
        "privacidade §10: a frase das marcações dos comprovantes enviados",
      ).not.toBe("");
      expect(
        marksPart.includes(
          "saem quando o app grava um aviso ou uma nova marcação, de qualquer motorista",
        ),
      ).toBe(marksOnAnyWrite);
      expect(marksPart.includes(UNTIL_WIPED)).toBe(
        !/onRehydrateStorage|\bmigrate:/.test(proof),
      );

      // The pause: no clock, cleared by this phone's own end, by the server's
      // answer (`adopt`) or by a refused start.
      const pause = mobile(PAUSE_STORE);
      const pauseExpires = /Date\.now\(\)\s*-|TTL_MS|\bprune\w*\(/.test(pause);
      const adopts =
        /\badopt:/.test(pause) &&
        /\.adopt\(/.test(mobile("features/pauses/use-driver-pause.ts"));
      const pauseRow = rowOf("privacidade", "Pausa em andamento, no celular");

      expect(
        pauseRow.includes(
          "fica até o app ser desinstalado ou ter os dados limpos",
        ),
      ).toBe(!pauseExpires);
      expect(
        pauseRow.includes(
          "ou saber do fim pelo servidor quando o mesmo motorista voltar a usá-lo",
        ),
      ).toBe(adopts);
      expect(pauseRow).not.toMatch(/Até a pausa terminar/);

      // The pause tap caught mid-handoff: only its own driver's next start
      // queues it (`takeLeftoverHandoffs(userId)`), and no clock drops it.
      // The body's brace ends its line; the return type's object does not.
      const takeLeftovers = blockAfter(
        pause,
        /function takeLeftoverHandoffs\([\s\S]*?\{(?=\r?\n)/,
      );
      const ownerOnly = /handoff\.ownerUserId !== userId\) continue/.test(
        takeLeftovers,
      );
      const recovered = /\btakeLeftoverHandoffs\(userId\)/.test(
        mobile("features/pauses/pause-actions.ts"),
      );
      const handoffPart =
        pauseRow.split("O toque ainda não enviado nem posto na fila")[1] ?? "";

      expect(
        handoffPart,
        "privacidade §10: o toque de pausa ainda não enviado",
      ).not.toBe("");
      expect(
        handoffPart.includes(
          "vai para a fila quando o mesmo motorista voltar a abrir o app",
        ),
      ).toBe(ownerOnly && recovered);
      expect(
        handoffPart.includes(
          "se ele não voltar, fica até o app ser desinstalado ou ter os dados limpos",
        ),
      ).toBe(ownerOnly && !pauseExpires);

      // The positions: someone else's state is dropped whole (`claimFor`) at
      // the next driver's first flush, which the signed-in layout's tracking
      // hook runs even with no route; the logout tries to send the owner's
      // before the session ends.
      const claimFor = blockAfter(
        mobile("features/tracking/state-rules.ts"),
        /function claimFor\([^)]*\)[^{]*\{/,
      );
      const othersReset =
        /ownerId === userId\s*\?\s*state\s*:\s*\{\s*\.\.\.EMPTY_STATE/.test(
          claimFor,
        ) &&
        /claimFor\(saved, userId\)/.test(
          mobile("features/tracking/reporter.ts"),
        ) &&
        /if \(!wanted\) \{[\s\S]*?await flush\(\)/.test(
          mobile("features/tracking/use-position-tracking.ts"),
        ) &&
        /\busePositionTracking\(/.test(mobile("app/(protected)/_layout.tsx"));
      const flushesFirst = /\bflushBeforeSignOut\(/.test(
        blockAfter(mobile("store/auth-store.ts"), "logout: async () => {"),
      );
      const positionsRow = rowOf("privacidade", "Posições da rota no celular");

      expect(
        positionsRow.includes(
          "Tudo isso é descartado quando outro motorista entra no app neste aparelho",
        ),
      ).toBe(othersReset);
      expect(
        logoutParagraph(
          "privacidade",
          "Sair da conta apaga do aparelho",
        ).rest.includes(
          "são descartadas quando outro motorista entra no app neste aparelho",
        ),
      ).toBe(othersReset);
      expect(
        logoutParagraph("privacidade", "Sair da conta apaga do aparelho").rest,
      ).toContain(
        flushesFirst
          ? "o app tenta enviar antes as posições pendentes da rota"
          : "as posições pendentes da rota",
      );
      expect(
        text("privacidade").includes(
          "o app tenta enviar antes as posições pendentes da rota",
        ),
      ).toBe(flushesFirst);
    },
  );

  /**
   * The folders the app writes files to (`new Directory(Paths.…, name)`), and
   * how §8 of the privacy policy and §5 of the cookie policy name what each
   * holds. Drafts and the queue are their own bullets; the rest is the cache.
   */
  const FILE_ROOTS: Record<string, string> = {
    "document/trajetto-drafts": "os formulários começados e ainda não enviados",
    "document/trajetto-outbox":
      "a fila de registros confirmados sem sinal, com as fotos",
    "cache/trajetto-chat-audio":
      "as mensagens de voz do chat já baixadas ou gravadas neste aparelho",
    "cache/trajetto-signatures":
      "cópias temporárias das fotos e da assinatura feitas no app",
  };

  /**
   * Every file that draws an image, and how the cache bullet names the copy
   * it leaves. expo-image keeps every image on disk unless told otherwise;
   * react-native's Image keeps network images only. null: a bundled asset or
   * a photo still on the phone, drawn by react-native's Image.
   */
  const IMAGE_VIEWERS: Record<string, string | null> = {
    "app/(auth)/login.tsx": null,
    "components/animated-splash-screen.tsx": null,
    "app/(protected)/delivery-proof.tsx": null,
    "app/(protected)/delivery-occurrence.tsx": null,
    "components/screens/fuel/fuel-form.tsx": null,
    "components/screens/chat/chat-composer.tsx": null,
    "components/ui/avatar.tsx": "fotos de perfil",
    "components/screens/chat/chat-media-viewer.tsx": "fotos do chat",
    "components/screens/chat/image-grid-bubble.tsx": "fotos do chat",
    "components/screens/chat/message-bubble.tsx": "fotos do chat",
    "components/screens/checklist/checklist-photo-section.tsx":
      "fotos do checklist",
  };

  // Files are not AsyncStorage keys, so the key inventory above cannot see
  // them: the voice notes and the images the app caches outlive the logout
  // too, and the texts say so while nothing wipes them.
  it.skipIf(!HAS_MOBILE)(
    "describes the files the app keeps on the phone (trajetto-mobile, expo-file-system and image caches)",
    () => {
      const sources = mobileCode().map(
        (path) => [mobileRel(path), readFileSync(path, "utf8")] as const,
      );
      const sections = [
        sectionOf("privacidade", "## 8."),
        sectionOf("cookies", "## 5."),
      ];

      // The folders, both ways.
      const roots = new Set<string>();

      for (const [file, source] of sources) {
        for (const call of source.matchAll(
          /new (?:Directory|File)\(\s*Paths\.(\w+)\s*,\s*([^,)]+)/g,
        )) {
          const argument = call[2].trim();
          const name =
            /^"([^"]+)"$/.exec(argument)?.[1] ??
            new RegExp(String.raw`\bconst ${argument}\s*=\s*"([^"]+)"`).exec(
              source,
            )?.[1];
          if (!name)
            throw new Error(
              `${file}: pasta que o teste não sabe ler: ${argument}`,
            );

          roots.add(`${call[1]}/${name}`);
        }
      }

      expect(
        [...roots].sort(),
        "pasta nova no aparelho (acrescente-a a FILE_ROOTS e aos textos)",
      ).toEqual(Object.keys(FILE_ROOTS).sort());

      // The screens that draw images, both ways.
      const viewers = sources.filter(([, source]) =>
        [
          ...source.matchAll(
            /import\s*\{([^}]*)\}\s*from\s*"(?:react-native|expo-image)"/g,
          ),
        ].some((match) => /\bImage\b/.test(match[1])),
      );

      expect(
        viewers.map(([file]) => file).sort(),
        "tela nova que desenha imagens (acrescente-a a IMAGE_VIEWERS)",
      ).toEqual(Object.keys(IMAGE_VIEWERS).sort());

      for (const [file, source] of viewers) {
        const expoImage = /from\s*"expo-image"/.test(source);
        const policies = [...source.matchAll(/cachePolicy="(\w[\w-]*)"/g)].map(
          (match) => match[1],
        );
        const onDisk =
          expoImage &&
          (policies.length === 0 ||
            policies.some((policy) => /disk/.test(policy)));

        if (onDisk)
          expect(
            IMAGE_VIEWERS[file],
            `${file}: o expo-image guarda a imagem no disco`,
          ).not.toBeNull();
      }

      const cached = [
        ...new Set(
          Object.values(IMAGE_VIEWERS).filter(
            (phrase): phrase is string => phrase !== null,
          ),
        ),
      ];
      const listed = /as imagens já exibidas no app \(([^)]*)\)/;

      // Camera and gallery results, and their re-encoded copies, land in the cache.
      const tempCopies = sources.some(([, source]) =>
        /ImagePicker\.launch(?:Camera|ImageLibrary)Async\(|\bmanipulateAsync\(/.test(
          source,
        ),
      );

      // The voice notes' ceiling, oldest first.
      const limits =
        /AUDIO_CACHE_LIMITS[^=]*=\s*\{\s*maxFiles:\s*([^,]+),\s*maxBytes:\s*([^,]+),/.exec(
          mobile("features/chat/audio-cache-rules.ts"),
        );
      if (!limits) throw new Error("AUDIO_CACHE_LIMITS não encontrado");

      const maxFiles = evaluate(limits[1], []);
      const maxMegabytes = evaluate(limits[2], []) / (1024 * 1024);
      const oldestFirst = /a\.modifiedAt - b\.modifiedAt/.test(
        mobile("features/chat/audio-cache-rules.ts"),
      );

      for (const section of sections) {
        for (const phrase of Object.values(FILE_ROOTS))
          expect(section).toContain(phrase);

        expect(listWords(listed.exec(section)?.[1] ?? "")).toEqual(
          cached.sort(),
        );
        expect(section.includes("cópias temporárias das fotos")).toBe(
          tempCopies,
        );
        expect(section).toContain(
          `(até ${maxFiles} arquivos ou ${maxMegabytes} MB; as mais antigas saem primeiro)`,
        );
        expect(
          oldestFirst,
          "o cache de áudio deixou de tirar os mais antigos primeiro",
        ).toBe(true);
      }

      // Nothing in the app empties these files: they outlive the logout.
      const wipesCache = sources.some(
        ([, source]) =>
          /\bclear(?:Disk|Memory)Cache\(/.test(source) ||
          /audioCacheDirectory\(\)\.delete\(|Directory\(\s*Paths\.cache[^)]*\)\.delete\(/.test(
            source,
          ),
      );
      const row = rowOf("privacidade", "Arquivos do cache do app, no celular");

      expect(row).toContain(
        `passa de ${maxFiles} arquivos ou ${maxMegabytes} MB`,
      );
      expect(row.includes("Continuam depois de sair da conta")).toBe(
        !wipesCache,
      );
      expect(
        row.includes("ficam até o app ser desinstalado ou ter os dados limpos"),
      ).toBe(!wipesCache);
      expect(
        logoutParagraph(
          "privacidade",
          "Sair da conta apaga do aparelho",
        ).rest.includes(
          "os arquivos do cache do app também continuam, sem separação por motorista",
        ),
      ).toBe(!wipesCache);
      expect(
        logoutParagraph(
          "cookies",
          "Sair da conta apaga a sessão",
        ).rest.includes("assim como os arquivos do cache do app"),
      ).toBe(!wipesCache);
    },
  );
});

describe("what the message providers report", () => {
  // The statuses the webhooks store with each send; each one is something
  // the platform learns about the person who got the message.
  const WORDS: Record<string, RegExp | null> = {
    sent: /enviad[ao]/,
    delivered: /entregue/,
    read: /lid[ao] \(no WhatsApp\)/,
    failed: /recusad[ao]/,
    bounced: /recusad[ao]/,
    suppressed: /recusad[ao]/,
    complained: /marcad[ao] como spam/,
    // A transient delay, never a final state of the send.
    delivery_delayed: null,
  };

  it.skipIf(!HAS_API)(
    "names every status the e-mail and WhatsApp webhooks record (trajetto-api/src/shared/providers)",
    () => {
      const ranks = [
        api("src/shared/providers/whatsapp-provider/meta-webhook.ts"),
        api("src/shared/providers/mail-provider/resend-webhook.ts"),
      ].map(
        (source) =>
          /_STATUS_RANK: Record<string, number> = \{([\s\S]*?)\};/.exec(
            source,
          )?.[1],
      );

      const statuses = ranks.flatMap((rank) => {
        if (!rank) throw new Error("STATUS_RANK não encontrado");
        return [...rank.matchAll(/(\w+):\s*\d/g)].map((match) => match[1]);
      });

      const section =
        /\n## 4\.[\s\S]*?(?=\n## 5\.)/.exec(body("privacidade"))?.[0] ?? "";
      const recipients = section.replace(/\s+/g, " ");

      for (const status of new Set(statuses)) {
        expect(
          status in WORDS,
          `status ${status} sem descrição na política`,
        ).toBe(true);

        const word = WORDS[status];
        if (word) expect(recipients, status).toMatch(word);
      }
    },
  );
});

describe("the third parties a browser reaches", () => {
  /**
   * Every host the Content-Security-Policy lets a page load from or send to,
   * and the provider (and what of it) the policy has to name. A host added to
   * the CSP without a line here fails: it is a third party nobody disclosed.
   */
  const HOSTS: Record<string, { provider: string; names: string }> = {
    "https://*.tile.openstreetmap.org": {
      provider: "OpenStreetMap Foundation",
      names: "tile.openstreetmap.org",
    },
    "https://nominatim.openstreetmap.org": {
      provider: "OpenStreetMap Foundation",
      names: "Nominatim",
    },
    "https://challenges.cloudflare.com": {
      provider: "Cloudflare",
      names: "Turnstile",
    },
    "https://static.cloudflareinsights.com": {
      provider: "Cloudflare",
      names: "Web Analytics",
    },
    "https://*.r2.cloudflarestorage.com": {
      provider: "Cloudflare",
      names: "(R2)",
    },
    "https://viacep.com.br": { provider: "ViaCEP", names: "CEP" },
  };

  it("names every host of the CSP in the processors table", () => {
    const csp = buildContentSecurityPolicy();
    const hosts = new Set(csp.match(/https:\/\/[^\s;]+/g) ?? []);

    expect(hosts.size).toBeGreaterThan(0);

    for (const host of hosts) {
      const expected = HOSTS[host];

      expect(
        expected,
        `host ${host} na CSP sem provedor declarado nesta lista`,
      ).toBeDefined();
      expect(processorRow(expected.provider), host).toContain(expected.names);
    }
  });

  // The API serves one HTML page of its own, the integration console, with a
  // CSP that widens script-src to a CDN: the browser of whoever opens it
  // reaches that host too.
  const API_PAGE_HOSTS: Record<string, { provider: string; names: string }> = {
    "https://cdn.jsdelivr.net": {
      provider: "jsDelivr",
      names: "console interativo da API de integração",
    },
  };

  it.skipIf(!HAS_API)(
    "names every host of the API console's CSP in the processors table (trajetto-api/src/shared/integration/public-docs.ts)",
    () => {
      const directives =
        /const PUBLIC_DOCS_CSP_DIRECTIVES = \{([\s\S]*?)\n\};/.exec(
          api("src/shared/integration/public-docs.ts"),
        )?.[1];
      if (!directives)
        throw new Error("PUBLIC_DOCS_CSP_DIRECTIVES não encontrado");

      const hosts = new Set(directives.match(/https:\/\/[^\s"'`,]+/g) ?? []);

      expect(hosts.size).toBeGreaterThan(0);

      for (const host of hosts) {
        const expected = API_PAGE_HOSTS[host];

        expect(
          expected,
          `host ${host} na CSP do console sem provedor declarado`,
        ).toBeDefined();
        expect(processorRow(expected.provider), host).toContain(expected.names);
        expect(sectionOf("privacidade", "## 13."), host).toContain(
          expected.provider,
        );
      }

      for (const host of Object.keys(API_PAGE_HOSTS)) {
        expect(
          hosts,
          `${host} saiu da CSP do console: tire a linha da política`,
        ).toContain(host);
      }
    },
  );

  // "Ver no mapa" is a link, not a load: nothing reaches Google until the
  // click. The texts say so exactly while a screen has such a link.
  it("names every panel screen that links a record to Google Maps", () => {
    const SURFACES: Array<[RegExp, string]> = [
      [
        /^src\/features\/deliveries\/deliveries\/timeline\//,
        "histórico da entrega",
      ],
      [/^src\/features\/deliveries\/occurrences\//, "tela de ocorrências"],
    ];

    const linking = codeFiles(
      resolve(ROOT, "src"),
      (rel) => rel === "src/content",
    )
      .filter((file) =>
        /https:\/\/www\.google\.com\/maps/.test(readFileSync(file, "utf8")),
      )
      .map((file) => relative(ROOT, file).replace(/\\/g, "/"));

    const privacy = text("privacidade");
    const cited = privacy.includes('o link "Ver no mapa"');

    expect(cited, "privacidade §9: o link Ver no mapa").toBe(
      linking.length > 0,
    );

    if (!cited) return;

    const sentence = sentenceOf(
      "privacidade",
      'No painel, o link "Ver no mapa"',
    );

    for (const file of linking) {
      const surface = SURFACES.find(([path]) => path.test(file))?.[1];

      expect(
        surface,
        `${file}: link para o Google Maps sem descrição nas políticas`,
      ).toBeDefined();
      expect(sentence, file).toContain(surface);
    }
  });

  const tileScreens = () =>
    codeFiles(resolve(ROOT, "src"), (rel) => rel === "src/content")
      .filter((file) => /\btileLayer\(/.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, file).replace(/\\/g, "/"));

  it("lists every screen that loads map tiles", () => {
    const SURFACES: Array<[RegExp, string]> = [
      [/^src\/features\/control-tower\//, "torre de controle"],
      [/^src\/features\/routes\//, "página da rota"],
      [/\/location-picker\//, "seletor de local"],
    ];

    const maps = tileScreens();

    expect(maps.length).toBeGreaterThan(0);

    const row = processorRow("OpenStreetMap Foundation");
    const cookiesText = text("cookies");

    for (const file of maps) {
      if (/^src\/components\/contact-form\//.test(file)) continue;

      const surface = SURFACES.find(([path]) => path.test(file))?.[1];

      expect(
        surface,
        `${file}: mapa sem descrição nas políticas`,
      ).toBeDefined();
      expect(row, `privacidade §9 não cita o mapa da ${surface}`).toContain(
        surface,
      );
      expect(cookiesText, `cookies §3 não cita o mapa da ${surface}`).toContain(
        surface,
      );
    }
  });

  // /contact drew a Leaflet map with OpenStreetMap tiles for every visitor,
  // with or without an account, and the policies said so. It is a
  // server-drawn SVG now (PUB-14): the texts cite a contact-page map exactly
  // while that page loads tiles, in both directions.
  it("cites the contact-page map exactly while /contact loads map tiles", () => {
    const contactLoadsTiles = tileScreens().some((file) =>
      /^src\/components\/contact-form\//.test(file),
    );

    const CONTACT_MAP =
      /mapa[^.|]{0,60}página de contato|página de contato[^.|]{0,80}(?:mapa|OpenStreetMap)/i;

    expect(
      CONTACT_MAP.test(processorRow("OpenStreetMap Foundation")),
      "privacidade §9, linha do OpenStreetMap",
    ).toBe(contactLoadsTiles);
    expect(CONTACT_MAP.test(text("privacidade")), "privacidade §3 e §13").toBe(
      contactLoadsTiles,
    );
    expect(CONTACT_MAP.test(text("cookies")), "cookies §3, mapas").toBe(
      contactLoadsTiles,
    );
  });
});

describe("the features the texts describe exist", () => {
  /**
   * Features the schema modelled before any use case recorded them (decisions
   * 6.1, 6.2, 6.4 and 8.5, all shipped by now), and the chat's link to a
   * route. A text that names one before it ships describes a product that
   * does not exist; once a use case records it, the privacy policy has to
   * name it. What each one records is checked field by field further down.
   */
  interface Feature {
    name: string;
    /** How the texts name it (MDX comments aside). */
    named: RegExp;
    shipped: () => boolean;
    /** New personal data: once it ships, the privacy policy must say so. */
    mustDisclose: boolean;
  }

  const FEATURES: Feature[] = [
    {
      name: "pausas do motorista (decisão 6.1)",
      named: /\bpausas?\b/i,
      shipped: () =>
        apiUseCasesMatching(/DriverPause|driverPause|driver_pause/).length > 0,
      mustDisclose: true,
    },
    {
      name: '"a caminho" (decisão 6.4)',
      named: /\ba caminho\b/i,
      shipped: () =>
        apiUseCasesMatching(/ON_THE_WAY|on_the_way_at|onTheWay/).length > 0,
      mustDisclose: true,
    },
    {
      name: "respostas do formulário de ocorrência (decisão 6.2)",
      named: /formulário d[ae] ocorrência|campos do formulário/i,
      shipped: () => apiUseCasesMatching(/form_answers|formAnswers/).length > 0,
      mustDisclose: true,
    },
    {
      name: "categoria e validade da CNH (decisão 8.5)",
      named: /categoria (?:e validade )?da CNH|validade da CNH/i,
      shipped: () =>
        apiUseCasesMatching(
          /cnh_category|cnhCategory|cnh_expires_at|cnhExpiresAt/,
        ).length > 0,
      mustDisclose: true,
    },
    {
      name: "mensagem do chat ligada a uma rota (decisão 6.7)",
      named: /ligad[ao]s? a uma rota/i,
      shipped: () =>
        apiUseCasesMatching(/\brouteId\b|\broute_id\b/, "chat").length > 0,
      mustDisclose: false,
    },
  ];

  for (const feature of FEATURES) {
    it.skipIf(!HAS_API)(
      `${feature.name} (trajetto-api/src/modules/*/usecases)`,
      () => {
        const shipped = feature.shipped();

        for (const slug of SLUGS) {
          if (!shipped) {
            expect(
              feature.named.test(text(slug)),
              `${slug}.mdx descreve ${feature.name}, que o código ainda não tem`,
            ).toBe(false);
          }
        }

        if (shipped && feature.mustDisclose) {
          expect(
            feature.named.test(text("privacidade")),
            `o código já grava ${feature.name}: a Política de Privacidade (seção 4) precisa dizer`,
          ).toBe(true);
        }
      },
    );
  }

  // The business deletion removes database rows. The files those rows
  // pointed at (under a per-company prefix, and proof PDFs under a
  // per-delivery one) stay in the bucket, and the orphan collector only
  // looks at 30-to-33-day-old uploads no row ever claimed.
  it.skipIf(!HAS_API)(
    "says what a company's deletion does to its files (trajetto-api/src/modules/business/usecases/delete-business)",
    () => {
      const usecase = api(
        "src/modules/business/usecases/delete-business/delete-business-usecase.ts",
      );
      const purgesFiles = /upload|storage|purge|deleteFile|deleteObject/i.test(
        usecase,
      );

      const row = rowOf(
        "privacidade",
        "Fotos, assinaturas, áudios, anexos e PDFs",
      );
      const terms = text("termos");
      const notAutomatic = "essa remoção ainda não é automática";

      expect(row.toLowerCase().includes(notAutomatic)).toBe(!purgesFiles);
      expect(terms.toLowerCase().includes(notAutomatic)).toBe(!purgesFiles);

      // Nothing may promise more than the deletion does.
      expect(text("privacidade")).not.toMatch(/e só para isso/);
      expect(terms).not.toMatch(
        /exclui os dados ao fim do contrato, como descrito/,
      );
      expect(terms).not.toMatch(/Outros dados só são mantidos/);
    },
  );
});

describe('what the pauses, the occurrences and "a caminho" record', () => {
  /** Where a field is said: a phrase of one part of a text. */
  interface Anchor {
    in: string;
    says: string;
  }

  /**
   * Every field of a model and where the privacy policy says it, or null for
   * a field that is no personal data (ids, keys, timestamps of the row
   * itself). A new field fails until it is placed here, which is the moment
   * to decide whether the text has to say it.
   */
  function expectColumnsDescribed(
    model: string,
    described: Record<string, Anchor | null>,
  ): void {
    for (const field of modelFields(model)) {
      expect(
        field in described,
        `${model}.${field}: campo novo sem descrição (acrescente-o aqui)`,
      ).toBe(true);

      const anchor = described[field];
      if (anchor) expect(anchor.in, `${model}.${field}`).toContain(anchor.says);
    }

    for (const field of Object.keys(described)) {
      expect(modelFields(model), `${model}.${field} não existe mais`).toContain(
        field,
      );
    }
  }

  it.skipIf(!HAS_API)(
    "names every field a pause records (trajetto-api/prisma/schema.prisma, DriverPause)",
    () => {
      const section = sectionOf("privacidade", "### Pausas do motorista");
      const at = (says: string): Anchor => ({ in: section, says });

      const kinds = at("o tipo (");
      const times = at("o horário de início e de fim");
      const place = at("o local do início e do fim");
      const route = at("a rota que estava em andamento");
      // Decision 14.4: the company's pause type the driver chose.
      const pauseType = at(
        "o tipo de pausa que a empresa cadastrou e o motorista escolheu",
      );

      expectColumnsDescribed("DriverPause", {
        id: null,
        kind: kinds,
        occurrenceType: pauseType,
        occurrenceTypeId: pauseType,
        started_at: times,
        ended_at: times,
        start_latitude: place,
        start_longitude: place,
        end_latitude: place,
        end_longitude: place,
        note: at("a observação que o motorista escrever"),
        start_submission_id: null,
        end_submission_id: null,
        driver: null,
        driverId: null,
        business: null,
        businessId: null,
        route,
        routeId: route,
        created_at: null,
        updated_at: null,
      });

      // The kinds, both ways, as the section and the summary list them: one
      // the enum lacks is a promise; one the texts lack is undisclosed.
      const KIND_WORDS: Record<string, string> = {
        MEAL: "refeição",
        REST: "descanso",
        OTHER: "outra",
      };

      expect(enumValues("DriverPauseKind").sort()).toEqual(
        Object.keys(KIND_WORDS).sort(),
      );

      const expected = Object.values(KIND_WORDS).sort();
      const inSection = /o tipo \(([^)]*)\)/.exec(section)?.[1] ?? "";
      const inSummary =
        /registra no app\*\* \(([^)]*)\)/.exec(
          sectionOf("privacidade", "## 1."),
        )?.[1] ?? "";

      expect(listWords(inSection), "privacidade §4, Pausas: os tipos").toEqual(
        expected,
      );
      expect(listWords(inSummary), "privacidade §1: os tipos").toEqual(
        expected,
      );
    },
  );

  // The pause keeps where it started and ended, but the company's report has
  // no coordinates, and only the driver's own routes (start, end, current)
  // answer them. The texts say both, and that the report shows the rest.
  it.skipIf(!HAS_API)(
    "says what the pause report shows and who gets a pause's location back (pause-report-rules, pause-rules)",
    () => {
      const COORDINATES = /\b(?:start|end)_(?:latitude|longitude)\b/;
      const fields = [
        ...blockAfter(
          api(PAUSE_REPORT_RULES),
          "interface ReportPauseEntry {",
        ).matchAll(/^\s*(\w+)\??:/gm),
      ].map((match) => match[1]);

      // Each row of the report, and how "Quem vê" names it; status is derived
      // from the times (ended, ongoing, too long, not ended).
      const WORDS: Record<string, string | null> = {
        id: null,
        status: null,
        kind: "o tipo",
        occurrence_type_name: "o nome do tipo de pausa",
        started_at: "os horários",
        ended_at: "os horários",
        duration_minutes: "a duração",
        note: "a observação",
        routeId: "a rota",
      };

      expect(
        fields.filter((field) => !(field in WORDS) && !COORDINATES.test(field)),
        "campo novo no relatório de pausas (acrescente-o a WORDS e ao texto)",
      ).toEqual([]);

      const reportShowsPlace = fields.some((field) => COORDINATES.test(field));

      // Every API file that reads a pause's coordinates, apart from where
      // they are written and the driver's own view of the pause.
      const ownView = [
        "src/modules/driver-pause/usecases/current-driver-pause/current-driver-pause-controller.ts",
        "src/modules/driver-pause/usecases/end-driver-pause/end-driver-pause-controller.ts",
        "src/modules/driver-pause/usecases/start-driver-pause/start-driver-pause-controller.ts",
      ];
      const viewCallers = codeFiles(resolve(API, "src"))
        .filter((file) => /\btoPauseView\b/.test(readFileSync(file, "utf8")))
        .map((file) => relative(API, file).replace(/\\/g, "/"))
        .filter(
          (file) => file !== "src/modules/driver-pause/rules/pause-rules.ts",
        )
        .sort();
      const driverOnly = ownView.every((controller) =>
        /\bassertPauseDriver\(/.test(
          api(controller.replace(/-controller\.ts$/, "-usecase.ts")),
        ),
      );
      const otherReaders = codeFiles(resolve(API, "src"))
        .filter((file) => COORDINATES.test(readFileSync(file, "utf8")))
        .map((file) => relative(API, file).replace(/\\/g, "/"))
        .filter(
          (file) =>
            !/^src\/modules\/driver-pause\/(?:dtos|repositories)\//.test(
              file,
            ) &&
            !/^src\/modules\/driver-pause\/usecases\/(?:start|end)-driver-pause\/[^/]*-usecase\.ts$/.test(
              file,
            ) &&
            file !== "src/modules/driver-pause/rules/pause-rules.ts" &&
            file !== "src/routes/documentation/driver-pause-documentation.ts",
        );
      const webReaders = codeFiles(
        resolve(ROOT, "src"),
        (rel) => rel === "src/content",
      )
        .filter((file) => COORDINATES.test(readFileSync(file, "utf8")))
        .map((file) => relative(ROOT, file));

      expect(
        viewCallers,
        "a visão da pausa com o local passou a ser devolvida por outra rota",
      ).toEqual(ownView);
      expect(
        driverOnly,
        "as rotas da pausa deixaram de ser só do motorista",
      ).toBe(true);

      const hidden =
        !reportShowsPlace &&
        otherReaders.length === 0 &&
        webReaders.length === 0;
      const section = sectionOf("privacidade", "### Pausas do motorista");
      const whoSees =
        /\*\*Quem vê:\*\*([\s\S]*?)(?= - \*\*|$)/.exec(section)?.[1] ?? "";

      for (const field of fields) {
        const phrase = WORDS[field];
        if (phrase)
          expect(
            whoSees,
            `privacidade §4, Pausas, Quem vê: ${field}`,
          ).toContain(phrase);
      }

      expect(
        whoSees.includes(
          "O local não aparece nessa tela nem em nenhuma outra da empresa cliente",
        ),
        [...otherReaders, ...webReaders].join("\n"),
      ).toBe(hidden);
      expect(
        whoSees.includes("hoje ele só volta ao app do próprio motorista"),
      ).toBe(hidden && driverOnly);
      expect(
        sentenceOf(
          "privacidade",
          "O local do início e do fim das pausas é a exceção",
        ).includes("hoje ele não aparece em nenhuma tela da empresa cliente"),
      ).toBe(hidden);
    },
  );

  /** What refuses a company's deletion: the counts the use case checks. */
  function businessDeletionRefusals(): string[] {
    const counted = blockAfter(
      api(BUSINESS_REPOSITORY),
      /async countBusinessDependencies\([\s\S]*?\): Promise<[^>]*> \{/,
    );
    const names = [
      ...(
        /const \[([^\]]*)\]\s*=\s*await Promise\.all/.exec(counted)?.[1] ?? ""
      ).matchAll(/\w+/g),
    ].map((match) => match[0]);

    expect(
      names.length,
      "countBusinessDependencies não foi lido",
    ).toBeGreaterThan(0);

    const usecase = api(DELETE_BUSINESS);

    return names.filter((name) =>
      new RegExp(String.raw`dependencies\.${name}\s*>\s*0`).test(usecase),
    );
  }

  /** The history kinds that keep a driver from being deleted. */
  function driverHistoryRefusals(): string[] {
    const refusal = api(DRIVER_HISTORY_REFUSAL);
    const body = blockAfter(
      refusal,
      /function driverHistoryRefusal\([^)]*\)[^{]*\{/,
    );

    return [...body.matchAll(/counts\.(\w+)\s*>\s*0/g)].map(
      (match) => match[1],
    );
  }

  // How long a pause stays is the database's referential actions plus two
  // refusals, not a job: a driver with pauses cannot be deleted, and a
  // company with drivers cannot either. The text says exactly what those do.
  it.skipIf(!HAS_API)(
    "says what keeps a pause and whether anything in the product removes it (DriverPause, delete-driver, delete-business)",
    () => {
      const model =
        /\nmodel DriverPause \{([\s\S]*?)\n\}/
          .exec(prismaSchema())?.[1]
          ?.replace(/\/\/.*$/gm, "") ?? "";
      const relation = (field: string) =>
        new RegExp(
          String.raw`\n\s*${field}\s+\w+\??\s+@relation\(([^)]*)\)`,
        ).exec(model)?.[1] ?? "";

      const guarded =
        /countDriverPauses/.test(api(DELETE_DRIVER)) &&
        driverHistoryRefusals().includes("pauses");
      const driverRestricts =
        !/onDelete/.test(relation("driver")) ||
        /onDelete:\s*Restrict/.test(relation("driver"));
      const driverCascades = /onDelete:\s*Cascade/.test(relation("driver"));
      const businessCascades = /onDelete:\s*Cascade/.test(relation("business"));
      const companyRefusesDrivers =
        businessDeletionRefusals().includes("drivers");

      const withCompany = businessCascades && !companyRefusesDrivers;
      const withDriver = !guarded && driverCascades;

      const section = sectionOf("privacidade", "### Pausas do motorista");

      expect(relation("driver"), "DriverPause.driver").not.toBe("");
      expect(
        section.includes(
          "Um motorista com pausas registradas não pode ser excluído, só inativado",
        ),
      ).toBe(guarded && driverRestricts);
      expect(
        section.includes(
          "a empresa cliente só pode ser excluída quando não tem mais nenhum motorista cadastrado",
        ),
      ).toBe(companyRefusesDrivers);
      expect(section.includes("saem com a exclusão da empresa cliente")).toBe(
        withCompany,
      );
      expect(
        section.includes("hoje a plataforma não tem como excluí-las"),
      ).toBe(!withCompany && !withDriver);
    },
  );

  // Every alert the report raises, both ways (PAUSE_FLAG_CODES).
  it.skipIf(!HAS_API)(
    "names every alert of the pause report (trajetto-api/src/modules/driver-pause/rules/pause-report-rules.ts)",
    () => {
      const declared = /PAUSE_FLAG_CODES\s*=\s*\[([^\]]*)\]/.exec(
        api(PAUSE_REPORT_RULES),
      )?.[1];
      if (!declared) throw new Error("PAUSE_FLAG_CODES não encontrado");

      const WORDS: Record<string, string> = {
        MEAL_MISSING: "refeição ausente",
        MEAL_SHORT: "refeição ausente ou curta",
        DRIVING_REST_SHORT: "direção longa sem descanso",
        INTERJORNADA_SHORT: "intervalo curto entre duas jornadas",
        PAUSE_NOT_ENDED: "pausas esquecidas (abertas por mais de",
        PAUSE_TOO_LONG: "ou encerradas só depois disso)",
      };

      const codes = [...declared.matchAll(/"(\w+)"/g)]
        .map((match) => match[1])
        .sort();

      expect(
        codes,
        "alerta novo no relatório (acrescente-o a WORDS e ao texto)",
      ).toEqual(Object.keys(WORDS).sort());

      const purpose =
        /\*\*Para quê:\*\*([\s\S]*?)(?= - \*\*)/.exec(
          sectionOf("privacidade", "### Pausas do motorista"),
        )?.[1] ?? "";

      for (const [code, phrase] of Object.entries(WORDS)) {
        expect(purpose, `privacidade §4, Pausas: alerta ${code}`).toContain(
          phrase,
        );
      }
    },
  );

  // The operation's records leave with the company, and the company leaves
  // only once it has none of the rows the use case counts; a driver with any
  // history never leaves. The retention row says both, from the code.
  it.skipIf(!HAS_API)(
    "says what a company's deletion needs first (delete-business-usecase, driver-history-refusal)",
    () => {
      const WORDS: Record<string, string> = {
        branches: "filiais",
        users: "usuários",
        drivers: "motoristas",
      };

      const refused = businessDeletionRefusals();
      const history = driverHistoryRefusals();

      for (const name of refused) {
        expect(
          name in WORDS,
          `recusa nova na exclusão da empresa: ${name} (acrescente-a a WORDS e ao texto)`,
        ).toBe(true);
      }

      const row = rowOf("privacidade", "Cadastros e registros da operação");
      const clause = /só a permite sem ([^.;]*?) cadastrados/.exec(row)?.[1];

      expect(
        clause !== undefined,
        "privacidade §10: o que a exclusão da empresa exige antes",
      ).toBe(refused.length > 0);
      expect(listWords(clause ?? "")).toEqual(
        refused.map((name) => WORDS[name]).sort(),
      );
      expect(
        row.includes(
          "um motorista com histórico na operação não pode ser excluído, só inativado",
        ),
      ).toBe(history.length > 0);
      expect(
        row.includes(
          "na prática, essa exclusão é feita pela equipe do Trajetto",
        ),
      ).toBe(refused.includes("drivers") && history.length > 0);
    },
  );

  // A position is recorded only while one of the driver's routes runs, and
  // a driver with routes cannot be deleted: the last known position has no
  // way out through the product (the same defect as the pauses').
  it.skipIf(!HAS_API)(
    "says how long the last known position stays (DriverLastPosition, delete-driver-usecase)",
    () => {
      const model =
        /\nmodel DriverLastPosition \{([\s\S]*?)\n\}/
          .exec(prismaSchema())?.[1]
          ?.replace(/\/\/.*$/gm, "") ?? "";
      const cascades =
        /\n\s*driver\s+Driver\s+@relation\([^)]*onDelete:\s*Cascade/.test(
          model,
        );

      const routesGuard =
        driverHistoryRefusals().includes("routes") &&
        /countRoutesReferencing\(\{\s*driverId\s*\}\)/.test(api(DELETE_DRIVER));
      const onlyDuringRoute = /findActiveRouteForDriver\(/.test(
        api(
          "src/modules/route/usecases/record-driver-positions/record-driver-positions-usecase.ts",
        ),
      );
      const neverLeaves = routesGuard && onlyDuringRoute;

      expect(model, "model DriverLastPosition").not.toBe("");

      for (const [where, content] of [
        ["§5", sectionOf("privacidade", "## 5.")],
        ["§10", rowOf("privacidade", "Última posição conhecida do motorista")],
      ] as const) {
        expect(
          /sai (?:junto )?com o cadastro do motorista/.test(content),
          `privacidade ${where}`,
        ).toBe(cascades && !neverLeaves);
        expect(
          content.includes(
            "um motorista com rotas não pode ser excluído, só inativado",
          ),
          `privacidade ${where}`,
        ).toBe(neverLeaves);
      }
    },
  );

  // "Só sinaliza": the report's rules feed the report and nothing else. A
  // use case that blocked a route start or an assignment on a pause alert
  // would make the texts wrong.
  it.skipIf(!HAS_API)(
    "keeps the pause alerts as flags that gate nothing (trajetto-api/src/modules/driver-pause/rules/pause-report-rules.ts)",
    () => {
      const readers = codeFiles(resolve(API, "src"))
        .filter((file) => /pause-report-rules/.test(readFileSync(file, "utf8")))
        .map((file) => relative(API, file).replace(/\\/g, "/"))
        .filter(
          (file) =>
            !/^src\/modules\/driver-pause\/(?:usecases\/driver-pause-report|schemas)\//.test(
              file,
            ) &&
            file !== "src/routes/documentation/driver-pause-documentation.ts",
        );

      expect(
        readers,
        "as regras do relatório de pausas passaram a decidir outra coisa",
      ).toEqual([]);
      expect(sectionOf("privacidade", "### Pausas do motorista")).toContain(
        "os alertas não bloqueiam o motorista nem geram nenhuma consequência automática",
      );
      expect(text("termos")).toContain("os alertas não bloqueiam nada");
    },
  );

  it.skipIf(!HAS_API)(
    "names every field an occurrence records, its form answers and the tower's decision (DeliveryOccurrence)",
    () => {
      const section = sectionOf(
        "privacidade",
        "### Ocorrências: formulário e autorização da torre",
      );

      // What a driver's report records, as the drivers' list names it:
      // "ocorrências (tipo, descrição, fotos, local, horário e quem relatou)".
      const reported =
        /ocorrências \(([^)]*)\)/.exec(
          sectionOf("privacidade", "### Motoristas"),
        )?.[1] ?? "";
      const words = listWords(reported);
      // A whole item of the list, never a piece of another word.
      const listed = (says: string): Anchor => ({
        in: words.includes(says) ? says : "",
        says,
      });
      const told = (says: string): Anchor => ({ in: section, says });

      expect(
        reported,
        "privacidade §4, Motoristas: a lista do que a ocorrência registra",
      ).not.toBe("");

      expectColumnsDescribed("DeliveryOccurrence", {
        id: null,
        description: listed("descrição"),
        latitude: listed("local"),
        longitude: listed("local"),
        photos: listed("fotos"),
        client_submission_id: null,
        delivery: null,
        deliveryId: null,
        businessId: null,
        occurrenceType: listed("tipo"),
        occurrenceTypeId: null,
        reportedBy: listed("quem relatou"),
        reportedById: null,
        form_answers: told("As respostas ficam guardadas com a ocorrência"),
        form_version: told("a versão do formulário que valia no relato"),
        authorization_status: told("fica pendente, sem efeito na entrega"),
        authorizedBy: told("quem decidiu"),
        authorizedById: null,
        authorized_at: told("o horário da decisão"),
        authorization_note: told("o motivo, obrigatório ao negar"),
        escalated_at: told("o horário do escalonamento fica registrado"),
        events: null,
        occurred_at: listed("horário"),
        created_at: null,
        updated_at: null,
        // Decision 14.3: a delivery is proven by a DELIVERED occurrence.
        category: told(
          "cada tipo de ocorrência é de entrega, de não entrega ou de",
        ),
        receipt_photo: told("a foto do canhoto"),
        signature: told("a assinatura na tela"),
        received_by: told("o nome de quem recebeu"),
        // Decision 14.5: the support ticket a report opens (chat-ticket-rules).
        supportTicket: told("abrem um atendimento ligado à ocorrência"),
      });

      // Every state a request can end in, as the section tells it.
      const STATES: Record<string, string | null> = {
        NOT_REQUIRED: null,
        PENDING: "fica pendente",
        APPROVED: "aprovar",
        DENIED: "negar",
        SUPERSEDED: "o pedido é encerrado sem decisão",
      };

      expect(enumValues("OccurrenceAuthorizationStatus").sort()).toEqual(
        Object.keys(STATES).sort(),
      );

      for (const phrase of Object.values(STATES)) {
        if (phrase) expect(section).toContain(phrase);
      }

      // The deleted decider: SET NULL keeps the decision without the name.
      const setNull =
        /authorizedBy\s+User\?\s+@relation\([^)]*onDelete:\s*SetNull/.test(
          prismaSchema(),
        );
      expect(section.includes("continuam no registro, sem o nome dele")).toBe(
        setNull,
      );
    },
  );

  // Decision 6.3: who answers a request is the decide route's guard, which
  // lets MASTER (the Trajetto team) through; a panel report by someone that
  // guard admits is born approved in their name.
  it.skipIf(!HAS_API)(
    "says who decides a request and when a report is born approved (decider-rule, report-delivery-occurrence-usecase)",
    () => {
      const rule = api(
        "src/modules/delivery/usecases/authorize-occurrence/decider-rule.ts",
      );
      const decide = blockAfter(
        api("src/modules/middlewares/verify-permission.ts"),
        /function decidePermission\([\s\S]*?\): AppError \| null \{/,
      );
      const report = api(
        "src/modules/delivery/usecases/report-delivery-occurrence/report-delivery-occurrence-usecase.ts",
      );

      const staffDecides =
        /\bdecidePermission\(/.test(rule) &&
        /role === "MASTER"[^{]*\{\s*return null;/.test(decide);
      const selfAuthorizes =
        /\bcanDecideAuthorizations\(/.test(report) &&
        /selfAuthorized\s*\?\s*"APPROVED"/.test(report) &&
        /authorizedById:\s*authorizationStatus === "APPROVED" \? userId/.test(
          report,
        );

      const section = sectionOf(
        "privacidade",
        "### Ocorrências: formulário e autorização da torre",
      );

      expect(section.includes("no suporte, a equipe do Trajetto")).toBe(
        staffDecides,
      );
      expect(
        section.includes("o registro já sai autorizado em nome dele"),
      ).toBe(selfAuthorizes);
      expect(section).not.toMatch(
        /até alguém da empresa cliente com permissão/,
      );
    },
  );

  // What the request's notice carries, per channel, from the renderers.
  it.skipIf(!HAS_API)(
    "says what the request's notice carries on each channel (trajetto-api/src/shared/notifications/policies/delivery-occurrence-policy.ts)",
    () => {
      const policy = api(
        "src/shared/notifications/policies/delivery-occurrence-policy.ts",
      );
      const inApp = blockAfter(
        policy,
        /function renderAuthorizationRequestedInApp\([\s\S]*?\): RenderedInApp \{/,
      );
      const whatsapp = blockAfter(
        policy,
        /function renderAuthorizationRequestedWhatsApp\([\s\S]*?\): string \{/,
      );
      const decided = blockAfter(
        policy,
        /function renderAuthorizationDecidedPush\([\s\S]*?\): RenderedPush \{/,
      );

      // Each payload field a notice prints, and how the text names it; the
      // ids and the driver-or-panel flag print nothing about anyone.
      const WORDS: Record<string, string | null> = {
        reporterName: "o nome de quem relatou",
        occurrenceTypeName: "o tipo",
        recipientName: "o destinatário",
        answers: "as respostas",
        description: "o relato",
        deliveryId: null,
        fromDriver: null,
      };

      const fields = (source: string) => {
        const used = new Set(
          [...source.matchAll(/\bpayload\.(\w+)/g)].map((match) => match[1]),
        );
        // reporterLabel(payload) reads fromDriver.
        if (/reporterLabel\(payload\)/.test(source)) used.add("fromDriver");
        return used;
      };

      const sentence = sentenceOf("privacidade", "O aviso do pedido leva");
      const [platformPart, whatsappPart = ""] = sentence.split(
        "; a mensagem de WhatsApp",
      );

      for (const field of new Set([...fields(inApp), ...fields(whatsapp)])) {
        expect(
          field in WORDS,
          `campo ${field} num aviso de pedido sem descrição (acrescente-o a WORDS)`,
        ).toBe(true);
      }

      for (const [field, words] of Object.entries(WORDS)) {
        if (!words) continue;

        const inPlatform = fields(inApp).has(field);
        const onlyWhatsApp = fields(whatsapp).has(field) && !inPlatform;

        expect(
          platformPart.includes(words),
          `aviso na plataforma: ${field}`,
        ).toBe(inPlatform);
        expect(
          whatsappPart.includes(words),
          `aviso por WhatsApp: ${field}`,
        ).toBe(onlyWhatsApp);
      }

      expect(
        sectionOf(
          "privacidade",
          "### Ocorrências: formulário e autorização da torre",
        ).includes(
          "O motorista recebe o resultado no celular, por notificação, com o motivo quando houver",
        ),
      ).toBe(/\bpayload\.note\b/.test(decided));
    },
  );

  // Who hears of a request and of its escalation, and on which channels: the
  // in-app render is also the push and the e-mail (pipeline), so "the
  // platform's notifications" hid an e-mail through Resend.
  it.skipIf(!HAS_API)(
    "says who gets the request's notice and the escalation, and on which channels (delivery-occurrence-policy, notification pipeline)",
    () => {
      const policy = api(
        "src/shared/notifications/policies/delivery-occurrence-policy.ts",
      );
      const requested = blockAfter(
        policy,
        /deliveryOccurrenceAuthorizationRequestedPolicy:[^=]*=\s*\{/,
      );
      const escalated = blockAfter(
        policy,
        /deliveryOccurrenceAuthorizationEscalatedPolicy:[^=]*=\s*\{/,
      );
      const pipeline = api(
        "src/shared/notifications/notification-pipeline-service.ts",
      );
      const rules = api("src/shared/notifications/pipeline-rules.ts");
      const deliverPush = blockAfter(
        pipeline,
        /private async deliverPush\([\s\S]*?\): Promise<undefined> \{/,
      );

      const toOperators = /findDeliveryOperators\(/.test(requested);
      const toAdmins = /findBusinessAdminsByBusinessId\(/.test(escalated);
      const inApp = /\brenderInApp:/.test(requested);
      const email =
        inApp &&
        /hasEmailContent:\s*Boolean\(policy\.renderInApp\)/.test(pipeline) &&
        !/suppressEmail:\s*true/.test(requested) &&
        /hasEmailContent && flags\.emailNotificationsEnabled/.test(rules);
      const push =
        inApp &&
        !/\brenderPush:/.test(requested) &&
        /policy\.renderInApp!\(/.test(deliverPush) &&
        /Boolean\(options\.hasPushDevice\)/.test(rules);

      const section = sectionOf(
        "privacidade",
        "### Ocorrências: formulário e autorização da torre",
      );
      const [platformPart] = sentenceOf(
        "privacidade",
        "O aviso do pedido leva",
      ).split("; a mensagem de WhatsApp");

      expect(platformPart.includes("a quem acompanha as entregas")).toBe(
        toOperators,
      );
      expect(platformPart.includes("no sino")).toBe(inApp);
      expect(
        platformPart.includes("no push do app para quem o tem instalado"),
      ).toBe(push);
      expect(
        platformPart.includes("por e-mail para quem ligou esse canal"),
      ).toBe(email);
      expect(platformPart).not.toMatch(/pelas notificações da plataforma/);
      expect(
        section.includes(
          "o pedido é escalado aos administradores da empresa cliente",
        ),
      ).toBe(toAdmins);
    },
  );

  // The recipient's page and the public PDF read occurrences too. The type
  // (and, in the PDF, the report's text) leaves the company; the form's
  // answers and the tower's decision must not, and today neither surface
  // filters out a request still pending, denied or superseded.
  it.skipIf(!HAS_API)(
    "says what of an occurrence reaches the tracking page and the proof PDF (external-recipient-repository, proof-document-repository)",
    () => {
      const trackingSelect = blockAfter(
        api(
          "src/modules/delivery/repositories/external-recipient-repository.ts",
        ),
        "occurrences: {",
      );
      const pdfSelect = blockAfter(
        api("src/modules/delivery/repositories/proof-document-repository.ts"),
        "occurrences: {",
      );
      const view = blockAfter(
        api("src/shared/delivery/customer-tracking.ts"),
        "...source.occurrences.map((occurrence) => ({",
      );
      const pdfRender = api("src/shared/delivery/proof-document.ts");

      const INTERNAL =
        /form_answers|form_version|authorization_note|authorizedBy|authorized_at|escalated_at/;
      const leaks = INTERNAL.test(trackingSelect) || INTERNAL.test(pdfSelect);
      const filters = (select: string) => /authorization_status/.test(select);

      const trackingShowsType =
        /occurrenceType:\s*\{\s*select:\s*\{\s*name:\s*true/.test(
          trackingSelect,
        ) && /title:\s*occurrence\.typeName/.test(view);
      const trackingShowsReport = /occurrence\.description/.test(view);
      const pdfShowsReport =
        /description:\s*true/.test(pdfSelect) &&
        /occurrence\.description/.test(pdfRender);
      // The platform's own types ("Comprovante rejeitado") stay off the page.
      const skipsSystem = (select: string) => /is_system:\s*false/.test(select);
      // Decision 14.3: a DELIVERED occurrence is the proof itself.
      const onlyNotDelivered = (select: string) =>
        /category:\s*"NOT_DELIVERED"/.test(select);
      // Layout 2 (decision 14.8) prints one occurrence: the latest blocking
      // one of a failed delivery, by type, with its photo and fix.
      const pdfPrintsLatestBlocking =
        /\.filter\(\(occurrence\) => occurrence\.blocking\)/.test(pdfRender) &&
        /occurrence\?\.typeName/.test(pdfRender) &&
        /photoKey:\s*occurrence\?\.photoKey/.test(pdfRender);

      const section = sectionOf(
        "privacidade",
        "### Ocorrências: formulário e autorização da torre",
      );

      expect(
        section.includes(
          "aparece também no histórico da página de acompanhamento do destinatário",
        ),
      ).toBe(trackingShowsType && !trackingShowsReport);
      expect(
        section.includes(
          "o tipo de cada ocorrência de não entrega, menos as geradas pela própria plataforma, aparece",
        ),
      ).toBe(
        trackingShowsType &&
          skipsSystem(trackingSelect) &&
          onlyNotDelivered(trackingSelect),
      );
      expect(
        section.includes(
          "o tipo com o relato de todas elas aparece no PDF do comprovante",
        ),
      ).toBe(pdfShowsReport && !skipsSystem(pdfSelect));
      expect(
        section.includes(
          "o tipo da última ocorrência de não entrega que impediu a entrega, com a primeira foto e o local dela",
        ),
      ).toBe(
        !pdfShowsReport &&
          onlyNotDelivered(pdfSelect) &&
          pdfPrintsLatestBlocking,
      );
      expect(section.includes("O relato escrito não aparece no PDF")).toBe(
        !pdfShowsReport,
      );
      expect(
        filters(trackingSelect),
        "só uma das duas superfícies filtra os pedidos: reescreva a frase por superfície",
      ).toBe(filters(pdfSelect));
      expect(
        section.includes(
          "Hoje isso inclui os pedidos de autorização ainda pendentes, negados ou encerrados sem decisão",
        ),
      ).toBe(!filters(trackingSelect));
      expect(
        section.includes(
          "As respostas do formulário e a decisão da torre não aparecem em nenhum dos dois",
        ),
      ).toBe(!leaks);
    },
  );

  // The field types the web's form builder offers, both ways.
  it.skipIf(!HAS_API)(
    "lists the field types of the occurrence form (trajetto-api/src/modules/occurrence-type/form)",
    () => {
      const rules = api(
        "src/modules/occurrence-type/form/occurrence-form-rules.ts",
      );
      const declared = /OCCURRENCE_FORM_FIELD_TYPES\s*=\s*\[([^\]]*)\]/.exec(
        rules,
      )?.[1];
      if (!declared)
        throw new Error("OCCURRENCE_FORM_FIELD_TYPES não encontrado");

      const WORDS: Record<string, string> = {
        text: "texto",
        number: "número",
        boolean: "sim ou não",
        select: "lista de opções",
        date: "data",
      };

      const types = [...declared.matchAll(/"(\w+)"/g)]
        .map((match) => match[1])
        .sort();

      expect(types).toEqual(Object.keys(WORDS).sort());
      expect(
        sectionOf(
          "privacidade",
          "### Ocorrências: formulário e autorização da torre",
        ),
      ).toContain("(texto, número, sim ou não, lista de opções e data)");
    },
  );

  it.skipIf(!HAS_API)(
    "names every moment the recipient can be messaged (trajetto-api/src/shared/notifications/policies/delivery-customer-policy.ts)",
    () => {
      const policy = api(
        "src/shared/notifications/policies/delivery-customer-policy.ts",
      );
      const map = /const TOPIC_BY_EVENT[^=]*=\s*\{([\s\S]*?)\};/.exec(
        policy,
      )?.[1];
      if (!map) throw new Error("TOPIC_BY_EVENT não encontrado");

      const topics = new Set(
        [...map.matchAll(/:\s*"(\w+)"/g)].map((match) => match[1]),
      );

      const WORDS: Record<string, RegExp> = {
        DISPATCHED: /saiu para entrega/,
        ON_THE_WAY: /a caminho/,
        DELIVERED: /(?<!não )entregue/,
        FAILED: /não entregue/,
      };

      const paragraph =
        body("privacidade")
          .split(/\n\s*\n/)
          .find((block) => block.startsWith("**Mensagens ao destinatário.**"))
          ?.replace(/\s+/g, " ") ?? "";
      const moments =
        /\(se houver telefone\): ([^.]+)\./.exec(paragraph)?.[1] ?? "";

      expect(
        moments,
        "a lista de momentos das mensagens ao destinatário",
      ).not.toBe("");

      for (const topic of topics) {
        expect(
          topic in WORDS,
          `tópico ${topic} sem descrição na política`,
        ).toBe(true);
      }

      for (const [topic, word] of Object.entries(WORDS)) {
        expect(
          word.test(moments),
          `${topic} na lista das mensagens ao destinatário`,
        ).toBe(topics.has(topic));
      }

      // The template fills in the recipient's data, never the driver's.
      const variables =
        /interface DeliveryMessageVariables \{([\s\S]*?)\n\}/.exec(
          api("src/shared/delivery/message-template.ts"),
        )?.[1];
      if (!variables)
        throw new Error("DeliveryMessageVariables não encontrado");

      const names = [...variables.matchAll(/^\s*(\w+):/gm)].map(
        (match) => match[1],
      );
      const carriesDriver = names.some((name) =>
        /motorista|placa|ve[ií]culo|latitude|longitude|local|posi[cç][aã]o|rota/i.test(
          name,
        ),
      );

      expect(names.length).toBeGreaterThan(0);
      expect(
        paragraph.includes(
          "não incluem o nome do motorista, a placa do veículo nem a localização",
        ),
      ).toBe(!carriesDriver);
    },
  );

  // The recipient's page reads a whitelist of event types; the text says the
  // "a caminho" event stays off it exactly while the whitelist leaves it out.
  it.skipIf(!HAS_API)(
    'says whether the tracking page shows "a caminho" (trajetto-api/src/modules/delivery/repositories/external-recipient-repository.ts)',
    () => {
      const repository = api(
        "src/modules/delivery/repositories/external-recipient-repository.ts",
      );
      const whitelist =
        /events:\s*\{\s*where:\s*\{\s*type:\s*\{\s*in:\s*\[([^\]]*)\]/.exec(
          repository,
        )?.[1];
      if (!whitelist)
        throw new Error("filtro de eventos do acompanhamento não encontrado");

      const shown = [...whitelist.matchAll(/"(\w+)"/g)].map(
        (match) => match[1],
      );

      expect(
        text("privacidade").includes(
          "A página de acompanhamento do destinatário não mostra esse evento",
        ),
      ).toBe(!shown.includes("ON_THE_WAY"));
    },
  );

  // When a driver can say "a caminho", what the mark writes (the stop's
  // instant and one event, field by field) and when it tells the customer.
  it.skipIf(!HAS_API)(
    'says when "a caminho" can be sent and what it records (mark-stop-on-the-way, RouteStop, DeliveryEvent)',
    () => {
      const rules = api(ON_THE_WAY_RULES);
      const refusal = blockAfter(
        rules,
        /function onTheWayRefusal\([\s\S]*?\): OnTheWayRefusal \| null \{/,
      );
      const notice = blockAfter(
        rules,
        /function shouldNoticeCustomer\([\s\S]*?\): boolean \{/,
      );
      const usecase = api(
        "src/modules/route/usecases/mark-stop-on-the-way/mark-stop-on-the-way-usecase.ts",
      );
      const apply = blockAfter(
        api(
          "src/modules/route/usecases/mark-stop-on-the-way/stop-on-the-way-repository.ts",
        ),
        /async applyMark\([\s\S]*?\): Promise<void> \{/,
      );

      const onlyRunningRoute = /routeStatus !== "IN_PROGRESS"/.test(refusal);
      const onlyPendingStop = /stopStatus !== "PENDING"/.test(refusal);
      const oncePerStop =
        /if \(previousOnTheWayAt\) return false;/.test(notice) &&
        /previousOnTheWayAt:\s*locked\.on_the_way_at/.test(usecase);

      const section = sectionOf("privacidade", '### Aviso de "a caminho"');
      const messages = sectionOf(
        "privacidade",
        "### Destinatários das entregas",
      );

      expect(section.includes("Durante uma rota em andamento")).toBe(
        onlyRunningRoute,
      );
      expect(section.includes("a um endereço que ainda não atendeu")).toBe(
        onlyPendingStop,
      );
      expect(
        messages.includes(
          'O aviso de "a caminho" sai só na primeira vez que o motorista marca aquela parada',
        ),
      ).toBe(oncePerStop);

      /** The keys of an object literal, comments aside. */
      const keysOf = (literal: string) =>
        [...literal.replace(/\/\/.*$/gm, "").matchAll(/(\w+):\s/g)]
          .map((match) => match[1])
          .sort();
      const at = (says: string): Anchor => ({ in: section, says });

      // The event, as the mark writes it.
      const EVENT: Record<string, Anchor | null> = {
        type: null,
        deliveryId: null,
        businessId: null,
        actor: null,
        client_submission_id: null,
        routeId: at("a rota"),
        reportedById: at("o motorista que avisou"),
        latitude: at("o local"),
        longitude: at("o local"),
        occurred_at: at("um evento com esse horário"),
      };
      const eventKeys = keysOf(
        blockAfter(apply, /tx\.deliveryEvent\.create\(\{\s*data: \{/),
      );

      expect(
        eventKeys,
        'campo novo no evento de "a caminho" (acrescente-o a EVENT e ao texto)',
      ).toEqual(Object.keys(EVENT).sort());

      for (const [field, anchor] of Object.entries(EVENT)) {
        if (anchor)
          expect(anchor.in, `DeliveryEvent.${field}`).toContain(anchor.says);
      }

      // The stop, field by field, and what the mark writes on it.
      const stopKeys = keysOf(
        blockAfter(apply, /tx\.routeStop\.updateMany\(\{[\s\S]*?\bdata: \{/),
      );
      const described: Record<string, Anchor | null> = {
        id: null,
        sequence: null,
        status: null,
        on_the_way_at: at("A plataforma grava na parada o horário do aviso"),
        arrived_at: {
          in: sectionOf("privacidade", "### Motoristas"),
          says: "chegadas ao endereço",
        },
        // The moment a proof or an occurrence settled the stop; both are
        // described with their own time.
        completed_at: null,
        route: null,
        routeId: null,
        delivery: null,
        deliveryId: null,
        created_at: null,
        updated_at: null,
      };

      expectColumnsDescribed("RouteStop", described);
      expect(stopKeys).toEqual(["on_the_way_at"]);

      for (const key of stopKeys)
        expect(
          described[key],
          `RouteStop.${key} gravado sem descrição`,
        ).not.toBeNull();
    },
  );

  /**
   * The web's screens that read "a caminho", by folder, and how the texts
   * name each. A new reader fails until it is placed here.
   */
  const ON_THE_WAY_SCREENS: Record<string, string | null> = {
    "src/features/deliveries/monitoring/": "O monitoramento",
    "src/features/routes/": "a tela de rotas mostram a parada",
    "src/features/control-tower/": "a torre de controle mostra o evento",
    "src/features/deliveries/deliveries/timeline/": "no histórico da entrega",
    // The template editor offers the topic; it shows no one's mark.
    "src/features/deliveries/message-templates/": null,
  };

  it('names every screen that shows "a caminho" (trajetto-ui/src/features)', () => {
    const readers = codeFiles(
      resolve(ROOT, "src"),
      (rel) => rel === "src/content" || rel === "src/actions",
    )
      .filter((file) =>
        /\bon_the_way(?:_at)?\b|\bonTheWay\w*|\bON_THE_WAY\b/.test(
          readFileSync(file, "utf8"),
        ),
      )
      .map((file) => relative(ROOT, file).replace(/\\/g, "/"));

    const unplaced = readers.filter(
      (file) =>
        !Object.keys(ON_THE_WAY_SCREENS).some((folder) =>
          file.startsWith(folder),
        ),
    );

    expect(
      unplaced,
      'tela nova que mostra "a caminho" (acrescente-a a ON_THE_WAY_SCREENS e ao texto)',
    ).toEqual([]);

    const section = sectionOf("privacidade", '### Aviso de "a caminho"');

    for (const [folder, phrase] of Object.entries(ON_THE_WAY_SCREENS)) {
      expect(
        readers.some((file) => file.startsWith(folder)),
        `${folder} não lê mais "a caminho"`,
      ).toBe(true);
      if (phrase)
        expect(section, `privacidade §4, "a caminho": ${folder}`).toContain(
          phrase,
        );
    }
  });

  /**
   * Every gesture of the app that records the phone's position, by the file
   * that asks for it, and how section 5 names it. A new caller of
   * captureLocation or of the location picker fails until it is listed.
   */
  const LOCATION_GESTURES: Record<string, string[]> = {
    "features/deliveries/hooks/use-delivery-actions.ts": [
      "uma chegada",
      "um comprovante",
      "uma ocorrência",
    ],
    "components/screens/fuel/fuel-form.tsx": ["um abastecimento"],
    "features/pauses/pause-actions.ts": ["o início ou o fim de uma pausa"],
    "features/deliveries/on-the-way-actions.ts": [
      "o aviso de que está a caminho",
    ],
  };

  it.skipIf(!HAS_MOBILE)(
    "lists every gesture that records the driver's position (trajetto-mobile, captureLocation and LocationPicker)",
    () => {
      const callers = mobileCode()
        .filter((file) =>
          /\bcaptureLocation\(|<LocationPicker\b/.test(
            readFileSync(file, "utf8"),
          ),
        )
        .map((file) => relative(MOBILE, file).replace(/\\/g, "/"))
        .filter(
          (file) =>
            !/^features\/tracking\//.test(file) &&
            file !== "components/ui/location-picker.tsx",
        )
        .sort();

      expect(
        callers,
        "gesto novo que grava a posição (acrescente-o a LOCATION_GESTURES)",
      ).toEqual(Object.keys(LOCATION_GESTURES).sort());

      const spots = sentenceOf("privacidade", "Pontos avulsos:");

      for (const phrase of Object.values(LOCATION_GESTURES).flat()) {
        expect(spots, `privacidade §5, pontos avulsos: ${phrase}`).toContain(
          phrase,
        );
      }

      // The summary repeats the ones that can happen outside a route.
      const summary = sectionOf("privacidade", "## 1.");
      for (const phrase of [
        "uma chegada",
        "um comprovante",
        "uma ocorrência",
        "um abastecimento",
        "o início e o fim de uma pausa",
      ]) {
        expect(summary, `privacidade §1: ${phrase}`).toContain(phrase);
      }
    },
  );
});

describe("what the proof PDF says about itself", () => {
  // Decision 14.8: the PDF is signed (PAdES, ICP-Brasil) when the owner's
  // certificate is installed, and says it is unsigned otherwise. The texts
  // said "não tem assinatura digital ICP-Brasil" unconditionally.
  it.skipIf(!HAS_API)(
    "says when the PDF carries an ICP-Brasil signature (trajetto-api/src/shared/delivery/proof-document.ts)",
    () => {
      const render = api("src/shared/delivery/proof-document.ts");
      const signsWhenCertified =
        /Assinado com Certificado Digital \(normas ICP-Brasil\)/.test(render) &&
        /Documento sem assinatura digital ICP-Brasil/.test(render);

      for (const slug of ["privacidade", "termos"] as const) {
        expect(
          text(slug).includes(
            "assinado digitalmente com o certificado ICP-Brasil da Trajetto",
          ),
          `${slug}: assinatura quando há certificado`,
        ).toBe(signsWhenCertified);
        expect(text(slug), `${slug}: PDF sempre sem assinatura`).not.toMatch(
          signsWhenCertified ? /não tem assinatura digital ICP-Brasil/ : /$^/,
        );
      }

      // The public site repeats it: the delivery FAQ and the proof article.
      for (const path of [
        "src/components/site/product/content.ts",
        "src/content/blog/comprovante-de-entrega-digital.mdx",
      ]) {
        const source = readFileSync(resolve(ROOT, path), "utf8").replace(
          /\s+/g,
          " ",
        );

        expect(source, `${path}: PDF sempre sem assinatura`).not.toMatch(
          signsWhenCertified ? /não tem assinatura digital ICP-Brasil/ : /$^/,
        );
        expect(
          source.includes("certificado ICP-Brasil da Trajetto"),
          path,
        ).toBe(signsWhenCertified);
      }
    },
  );

  // The stamp under the photo and the driver block (layout 2).
  it.skipIf(!HAS_API)(
    "lists what the stamp and the driver block print (proof-document.ts, proof-document-fields.ts)",
    () => {
      const render = api("src/shared/delivery/proof-document.ts");
      const fields = api("src/shared/delivery/proof-document-fields.ts");
      const stamp = blockAfter(
        fields,
        "function stampLine(input: StampInput): string {",
      );
      const section = sectionOf("privacidade", "## 6.");

      const stampNamesDriver = /input\.driverName/.test(stamp);
      const stampNamesRecipient = /recipient/i.test(stamp);
      const printsDeviceId =
        /"Identificação do Celular"[\s\S]{0,120}device_id/.test(render);

      expect(section.includes("o nome do motorista e o número da nota")).toBe(
        stampNamesDriver,
      );
      expect(section.includes("carimbo que repete transportadora")).toBe(false);
      expect(section.includes("destinatário; e a assinatura")).toBe(false);
      expect(
        stampNamesRecipient,
        "o carimbo passou a citar o destinatário",
      ).toBe(false);
      expect(section.includes("o identificador do celular")).toBe(
        printsDeviceId,
      );
    },
  );
});

describe("what the AI reader receives", () => {
  // Decision 14.1 (ADR 0010, 05/10/2026): the photos are read by Trajetto's
  // own OCR service, on its own infrastructure. The texts named Anthropic as
  // a sub-processor in the US, which stopped being true.
  it.skipIf(!HAS_API)(
    "says the photos are read on Trajetto's own infrastructure (env-schema, ai-provider)",
    () => {
      const envSchema = api("src/schemas/env-schema/index.ts");
      const provider = api("src/shared/ai/ai-provider.ts");
      const visionProviders = codeFiles(resolve(API, "src")).filter((file) =>
        /\bimplements\s+VisionProvider\b/.test(readFileSync(file, "utf8")),
      );

      const localOnly =
        /AI_PROVIDER:[\s\S]{0,200}\.enum\(\["local",\s*"none"\]/.test(
          envSchema,
        ) &&
        /return new LocalOcrReader\(/.test(provider) &&
        visionProviders.length === 0;

      const privacy = text("privacidade");

      expect(
        /anthropic|claude/i.test(privacy),
        "privacidade ainda cita a Anthropic",
      ).toBe(!localOnly);
      expect(
        privacy.includes(
          "num serviço de leitura de imagem que roda na infraestrutura da própria Trajetto",
        ),
      ).toBe(localOnly);
      expect(
        /anthropic|claude/i.test(text("termos")),
        "termos ainda cita a Anthropic",
      ).toBe(!localOnly);
    },
  );

  // The comparison with the delivery's data is the platform's (decision
  // 6.9): every call takes the photo and nothing personal, and the OCR
  // service receives the image bytes and the engine profile only.
  it.skipIf(!HAS_API)(
    "says the reading service receives only the photo (trajetto-api/src/shared/ai)",
    () => {
      const provider = api("src/shared/ai/ai-provider.ts");
      const prompts = api("src/shared/ai/ai-prompts.ts");
      const reader = api("src/shared/ai/local/local-ocr-reader.ts");

      const signature = (source: string, pattern: RegExp) => {
        const found = pattern.exec(source)?.[1];
        if (found === undefined)
          throw new Error(`assinatura não encontrada: ${pattern}`);
        return parameterNames(found);
      };

      const calls = {
        odometer: signature(provider, /\banalyzeOdometerImage\(([^)]*)\)/),
        checklist: signature(
          provider,
          /\banalyzeChecklistImage(?:<[^(]*>)?\(([^)]*)\)/,
        ),
        proof: signature(provider, /\banalyzeDeliveryProof\(([^)]*)\)/),
      };
      // What the photo should show: fixed labels, never a person's data.
      const specFields = [
        ...blockAfter(prompts, "interface ChecklistFieldSpec {").matchAll(
          /^\s*(\w+)\??:/gm,
        ),
      ].map((match) => match[1]);
      const request = blockAfter(reader, /this\.fetchImpl\([^,]*,\s*\{/);

      const onlyPhotos =
        JSON.stringify(calls) ===
          JSON.stringify({
            odometer: ["imagePath"],
            checklist: ["imagePath", "spec"],
            proof: ["imagePath"],
          }) &&
        specFields.every((field) =>
          ["kind", "subject", "hint"].includes(field),
        ) &&
        /\/v1\/read\?profile=\$\{profile\}`/.test(reader) &&
        /body:\s*image\.bytes,/.test(request);

      const section = sectionOf("privacidade", "## 7.");

      expect(section.includes("O serviço de leitura recebe só a foto")).toBe(
        onlyPhotos,
      );
      expect(section.includes("a conferência com os dados da entrega")).toBe(
        onlyPhotos,
      );
    },
  );

  // Decision 14.2: the phone reads the receipt and the odometer offline with
  // ML Kit and sends booleans only.
  it.skipIf(!HAS_MOBILE)(
    "describes the pre-check on the phone (trajetto-mobile/modules/text-reader, schemas/device-precheck.ts)",
    () => {
      const ships = existsSync(
        resolve(MOBILE, "modules/text-reader/expo-module.config.json"),
      );
      const schema = existsSync(resolve(MOBILE, "schemas/device-precheck.ts"))
        ? readFileSync(resolve(MOBILE, "schemas/device-precheck.ts"), "utf8")
        : "";
      const fields = [
        ...blockAfter(schema || "{}", /z\s*\.object\(\{/).matchAll(
          /^\s*(\w+):/gm,
        ),
      ].map((match) => match[1]);
      const booleansOnly =
        ships &&
        /mlkit/.test(schema) &&
        !fields.some((field) =>
          /text|lido|read_value|number$|date$|mileage$/.test(field),
        );

      const section = sectionOf("privacidade", "## 7.");

      expect(section.includes("pré-checagem no próprio celular")).toBe(ships);
      expect(section.includes("o texto lido não sai do celular")).toBe(
        booleansOnly,
      );
      expect(section.includes("A pré-checagem não consome a cota")).toBe(ships);
      expect(
        processorRow("ML Kit").includes(
          "a foto e o texto lido não saem do celular",
        ),
      ).toBe(booleansOnly);
    },
  );
});

describe("the data subject's rights", () => {
  // LGPD art. 18: the list in section 11 has to carry every item of it.
  it("lists every right of art. 18", () => {
    const rights = text("privacidade");

    for (const item of [
      "confirmar se tratamos dados seus e acessá-los", // I, II
      "corrigir dados incompletos", // III
      "anonimização, o bloqueio ou a eliminação", // IV
      "portabilidade", // V
      "saber com quem compartilhamos", // VII
      "possibilidade de não dar consentimento", // VIII
      "revogar um consentimento", // IX, VI
      "opor-se a um tratamento", // § 2º
      "revisão de decisões tomadas unicamente com base em tratamento automatizado", // art. 20
      "Autoridade Nacional de Proteção de Dados", // § 1º
    ]) {
      expect(rights, item).toContain(item);
    }
  });
});

describe("the company's identity", () => {
  // Decision 10.2: CNPJ, address and DPO come from the owner. The texts point
  // to the identification block instead of repeating (or inventing) them.
  it("is left to the identification block, never typed into a text", () => {
    for (const doc of loadLegalDocuments()) {
      expect(doc.body, `${doc.file}: CNPJ no texto`).not.toMatch(
        /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/,
      );
      expect(doc.body, `${doc.file}: e-mail no texto`).not.toMatch(
        /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
      );
    }
  });
});

// The pages say "Em vigor desde …": the identification block may say which
// fields are still to be filled, but not that a later "final version" is
// coming, which reads as if the text in force were a draft.
describe("the identification block", () => {
  it("does not call the document in force a draft", () => {
    const html = renderToStaticMarkup(React.createElement(LegalIdentity));

    expect(html).not.toMatch(/vers[ãa]o final|rascunho|provis[óo]ri/i);
  });
});

describe("the links inside the legal documents", () => {
  it("point to anchors on the page and to registered documents", async () => {
    const identityIds = [
      ...renderToStaticMarkup(React.createElement(LegalIdentity)).matchAll(
        /\sid="([^"]+)"/g,
      ),
    ].map((match) => match[1]);
    const slugs = new Set<string>(LEGAL_DOCUMENTS.map((doc) => doc.slug));

    for (const doc of loadLegalDocuments()) {
      const { Content } = await renderMdx(doc.body, {
        file: doc.file,
        components: legalMdxComponents,
      });
      const html = renderToStaticMarkup(React.createElement(Content));
      const ids = new Set([
        ...identityIds,
        ...[...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
      ]);

      for (const [, href] of html.matchAll(/\shref="([^"]+)"/g)) {
        if (href.startsWith("#")) {
          expect(
            ids.has(decodeURIComponent(href.slice(1))),
            `${doc.file}: âncora ${href}`,
          ).toBe(true);
        }

        const legal = /^\/legal\/([^/#?]+)/.exec(href);
        if (legal) {
          expect(slugs.has(legal[1]), `${doc.file}: ${href}`).toBe(true);
        }
      }
    }
  });
});
