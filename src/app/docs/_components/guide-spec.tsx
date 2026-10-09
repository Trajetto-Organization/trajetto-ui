import Link from "next/link";

import { AlertTriangle } from "lucide-react";

import { Markdown } from "../_lib/markdown";
import { DOCS_REFERENCE_PATH } from "../_lib/navigation";
import {
  allOperations,
  findOperation,
  headerParameter,
  typeLabel,
  webhookAnchor,
} from "../_lib/openapi";
import type { PublicSpec } from "../_lib/public-spec";

import {
  DOCS_CARD,
  DOCS_INLINE_CODE,
  DOCS_LINK,
  DOCS_TABLE,
  DOCS_TABLE_FRAME,
  DOCS_TD,
  DOCS_TH,
  tableRegionProps,
} from "./docs-type";
import { specProseComponents } from "./spec-prose";

/**
 * What the guides print from the public document: limits, the retry
 * schedule, topics, scopes, headers and parameters. Every number here comes
 * from the `x-trajetto-*` extensions the API computes from the constants that
 * enforce them, so a guide never carries a copy that can go stale.
 *
 * Synchronous views taking the document; docs-mdx binds them to the live
 * document (pages) or to a fixture (tests).
 */

interface SpecProps {
  spec: PublicSpec | null;
}

const TABLE = `${DOCS_TABLE} min-w-[480px]`;
const TH = DOCS_TH;
const TD = DOCS_TD;
/** Inline code in a cell, a step smaller than in the prose. */
const CELL_CODE = `${DOCS_INLINE_CODE} text-[12.5px]`;
/** Body text outside the prose components (lists and paragraphs the views write). */
const BODY = "text-[16.5px] leading-[1.7] text-[#2a2b33] dark:text-[#d4d5dc]";

const SpecUnavailable = ({ what }: { what: string }) => (
  <div
    role="note"
    className="my-6 flex items-start gap-3 rounded-[18px] border border-[rgba(245,158,11,.32)] bg-[rgba(245,158,11,.09)] px-5 py-4 text-sm text-[#92400e] dark:text-[#fbbf24]"
  >
    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
    <p>
      {what} vêm da referência da API, que não respondeu agora. Tente de novo em
      instantes ou abra a{" "}
      <Link
        href={DOCS_REFERENCE_PATH}
        className="font-medium underline underline-offset-4"
      >
        referência
      </Link>
      .
    </p>
  </div>
);

const TableFrame = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div {...tableRegionProps(label)} className={`my-6 ${DOCS_TABLE_FRAME}`}>
    {children}
  </div>
);

function formatInteger(value: number): string {
  return value.toLocaleString("pt-BR");
}

/** 30 → "30 s", 120 → "2 min", 3600 → "1 h", 5400 → "1 h 30 min". */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;

  if (seconds < 3_600) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;

    return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
  }

  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.round((seconds % 3_600) / 60);

  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

const RateLimitsView = ({ spec }: SpecProps) => {
  const limits = spec?.["x-trajetto-limits"];

  if (!limits) return <SpecUnavailable what="Os limites" />;

  const rows: Array<[string, string]> = [
    [
      "Teto de uma chave, definido pelo administrador da empresa",
      `até ${formatInteger(limits.key_per_minute_tenant_max)} por minuto`,
    ],
    [
      "Teto de uma chave, acima disso (só pelo suporte)",
      `até ${formatInteger(limits.key_per_minute_platform_max)} por minuto`,
    ],
    [
      "Teto da empresa, somando todas as chaves",
      `${formatInteger(limits.business_per_minute)} por minuto`,
    ],
    [
      "Chaves inválidas apresentadas por um mesmo endereço",
      `${formatInteger(limits.invalid_keys_per_address_per_minute)} por minuto; depois, 429 até a janela virar`,
    ],
    ["Janela de contagem", `${formatDuration(limits.window_seconds)}, fixa`],
    [
      "Espera indicada num 503 (`retry-after`)",
      formatDuration(limits.service_unavailable_retry_after_seconds),
    ],
  ];

  return (
    <TableFrame label="Tabela: limites de uso">
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>Limite</th>
            <th className={TH}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className={TD}>
                <Markdown source={label} components={specProseComponents} />
              </td>
              <td
                className={`${TD} whitespace-nowrap font-medium !text-site-ink`}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  );
};

const RetryScheduleView = ({ spec }: SpecProps) => {
  const webhooks = spec?.["x-trajetto-webhooks"];

  if (!webhooks) return <SpecUnavailable what="Os prazos de reenvio" />;

  let elapsed = 0;

  const attempts = [
    { attempt: 1, after: "Na hora em que o evento é gerado", total: "—" },
    ...webhooks.retry_delays_seconds.map((delay, index) => {
      elapsed += delay;

      return {
        attempt: index + 2,
        after: `${formatDuration(delay)} depois da anterior`,
        total: formatDuration(elapsed),
      };
    }),
  ];

  return (
    <>
      <TableFrame label="Tabela: tentativas de reenvio">
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>Tentativa</th>
              <th className={TH}>Quando</th>
              <th className={TH}>Desde o evento</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((row) => (
              <tr key={row.attempt}>
                <td className={`${TD} font-medium !text-site-ink`}>
                  {row.attempt}ª
                </td>
                <td className={TD}>{row.after}</td>
                <td className={TD}>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableFrame>

      <ul
        className={`mb-6 list-disc space-y-2 pl-6 marker:text-site-pink ${BODY}`}
      >
        <li>
          Esperamos a sua resposta por até{" "}
          <strong className="font-semibold text-site-ink">
            {formatDuration(webhooks.timeout_seconds)}
          </strong>
          ; depois disso, a tentativa conta como falha.
        </li>
        <li>
          São no máximo{" "}
          <strong className="font-semibold text-site-ink">
            {webhooks.max_attempts} tentativas
          </strong>{" "}
          por evento, ao longo de cerca de {formatDuration(elapsed)}.
        </li>
        <li>
          <strong className="font-semibold text-site-ink">
            {webhooks.max_consecutive_failures} falhas seguidas
          </strong>{" "}
          desligam o endpoint até alguém reativá-lo no painel.
        </li>
        <li>
          Eventos de um endpoint desligado ficam guardados por até{" "}
          <strong className="font-semibold text-site-ink">
            {webhooks.replay_window_days} dias
          </strong>
          , e o reenvio manual pelo painel vale dentro da mesma janela.
        </li>
      </ul>
    </>
  );
};

const FAMILY_LABELS = { route: "Rotas", document: "Documentos" } as const;

const TopicTableView = ({ spec }: SpecProps) => {
  const webhooks = spec?.["x-trajetto-webhooks"];

  if (!webhooks) return <SpecUnavailable what="Os tópicos" />;

  return (
    <>
      <TableFrame label="Tabela: tópicos de webhook">
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>Tópico</th>
              <th className={TH}>Quando</th>
              <th className={TH}>
                Formato de <code className="normal-case">data</code>
              </th>
            </tr>
          </thead>
          <tbody>
            {webhooks.topics.map((topic) => (
              <tr key={topic.topic}>
                <td className={`${TD} whitespace-nowrap`}>
                  <code className={CELL_CODE}>{topic.topic}</code>
                </td>
                <td className={TD}>{topic.description}</td>
                <td className={TD}>
                  <Link
                    href={`${DOCS_REFERENCE_PATH}#${webhookAnchor(topic.topic)}`}
                    className={`${DOCS_LINK} font-site-mono text-[12.5px]`}
                  >
                    {topic.payload}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableFrame>

      <p className={`mb-5 ${BODY}`}>
        {webhooks.families.map((family, index) => (
          <span key={family.family}>
            {index > 0 ? " " : ""}
            &ldquo;Todos os eventos&rdquo; de{" "}
            {FAMILY_LABELS[family.family].toLowerCase()} assina{" "}
            {family.wildcards.map((wildcard, position) => (
              <span key={wildcard}>
                {position > 0
                  ? position === family.wildcards.length - 1
                    ? " e "
                    : ", "
                  : ""}
                <code className={DOCS_INLINE_CODE}>{wildcard}</code>
              </span>
            ))}
            .
          </span>
        ))}
      </p>
    </>
  );
};

const ScopeTableView = ({ spec }: SpecProps) => {
  const authentication = spec?.["x-trajetto-authentication"];

  if (!authentication) return <SpecUnavailable what="Os escopos" />;

  return (
    <TableFrame label="Tabela: escopos">
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>Escopo</th>
            <th className={TH}>O que permite</th>
            <th className={TH}>Situação</th>
          </tr>
        </thead>
        <tbody>
          {authentication.scopes.map((entry) => (
            <tr key={entry.scope}>
              <td className={`${TD} whitespace-nowrap`}>
                <code className={CELL_CODE}>{entry.scope}</code>
              </td>
              <td className={TD}>{entry.description}</td>
              <td className={TD}>
                {entry.reserved ? (
                  <span className="text-[#92400e] dark:text-[#fbbf24]">
                    Reservado
                  </span>
                ) : (
                  <span className="text-[#047857] dark:text-[#34d399]">
                    Disponível
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  );
};

const WebhookHeadersView = ({ spec }: SpecProps) => {
  const webhooks = spec?.["x-trajetto-webhooks"];

  if (!webhooks) return <SpecUnavailable what="Os cabeçalhos" />;

  return (
    <TableFrame label="Tabela: cabeçalhos do webhook">
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>Cabeçalho</th>
            <th className={TH}>O que traz</th>
          </tr>
        </thead>
        <tbody>
          {webhooks.headers.map((header) => (
            <tr key={header.name}>
              <td className={`${TD} whitespace-nowrap`}>
                <code className={CELL_CODE}>{header.name}</code>
              </td>
              <td className={TD}>
                <Markdown
                  source={header.description}
                  components={specProseComponents}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  );
};

const OperationParametersView = ({
  spec,
  operation: operationId,
}: SpecProps & { operation?: string }) => {
  const entry =
    spec && operationId ? findOperation(spec, operationId) : undefined;

  if (!spec || !entry) return <SpecUnavailable what="Os parâmetros" />;

  const parameters = (entry.operation.parameters ?? []).filter(
    (parameter) => parameter.in === "query" || parameter.in === "path",
  );

  return (
    <TableFrame label="Tabela: parâmetros">
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>Parâmetro</th>
            <th className={TH}>Tipo</th>
            <th className={TH}>Descrição</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((parameter) => (
            <tr key={`${parameter.in}-${parameter.name}`}>
              <td className={`${TD} whitespace-nowrap`}>
                <code className={CELL_CODE}>{parameter.name}</code>
              </td>
              <td className={`${TD} whitespace-nowrap font-mono text-[12px]`}>
                {typeLabel(spec, parameter.schema)}
              </td>
              <td className={TD}>
                <Markdown
                  source={parameter.description}
                  components={specProseComponents}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  );
};

/** The endpoints that take `Idempotency-Key`, as the document declares them. */
const IdempotentOperationsView = ({ spec }: SpecProps) => {
  if (!spec) return <SpecUnavailable what="Os endpoints de escrita" />;

  const writes = allOperations(spec).filter((entry) =>
    headerParameter(entry.operation, "idempotency-key"),
  );

  if (writes.length === 0) {
    return (
      <p className={`mb-5 ${BODY}`}>
        Nenhum endpoint desta versão recebe <code>Idempotency-Key</code> no
        momento.
      </p>
    );
  }

  return (
    <ul className="mb-6 space-y-3">
      {writes.map((entry) => {
        const header = headerParameter(entry.operation, "idempotency-key");

        return (
          <li key={entry.anchor} className={`${DOCS_CARD} px-5 py-4`}>
            <Link
              href={`${DOCS_REFERENCE_PATH}#${entry.anchor}`}
              className="flex flex-wrap items-center gap-2 rounded-sm font-site-mono text-[13px] text-site-ink underline-offset-[3px] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-site-ink/40"
            >
              <span className="font-semibold">{entry.method}</span>
              <span>{entry.path}</span>
            </Link>
            {entry.operation.summary ? (
              <p className="mt-1 text-sm text-site-muted">
                {entry.operation.summary}
              </p>
            ) : null}
            <div className="mt-2">
              <Markdown
                source={header?.description}
                components={specProseComponents}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

/** Inline: the API's address, or a placeholder when it is unknown. */
const BaseUrlView = ({ spec }: SpecProps) => (
  <code className={DOCS_INLINE_CODE}>
    {spec?.servers?.[0]?.url ?? "https://<endereço-da-api>"}
  </code>
);

/** Inline: "300 segundos". */
const SignatureToleranceView = ({ spec }: SpecProps) => {
  const seconds = spec?.["x-trajetto-webhooks"]?.signature.tolerance_seconds;

  return (
    <strong className="font-semibold text-site-ink">
      {seconds ? `${seconds} segundos` : "alguns minutos"}
    </strong>
  );
};

/** Inline: "24 horas". */
const RotationGraceView = ({ spec }: SpecProps) => {
  const hours = spec?.["x-trajetto-webhooks"]?.signature.rotation_grace_hours;

  return (
    <strong className="font-semibold text-site-ink">
      {hours ? `${hours} horas` : "um prazo"}
    </strong>
  );
};

/** Inline: "10 endpoints". */
const MaxEndpointsView = ({ spec }: SpecProps) => {
  const max = spec?.["x-trajetto-webhooks"]?.max_endpoints_per_business;

  return (
    <strong className="font-semibold text-site-ink">
      {max ? `${max} endpoints` : "um número limitado de endpoints"}
    </strong>
  );
};

/** Inline: "10 chaves". */
const MaxKeysView = ({ spec }: SpecProps) => {
  const max = spec?.["x-trajetto-authentication"]?.max_active_keys_per_business;

  return (
    <strong className="font-semibold text-site-ink">
      {max ? `${max} chaves ativas` : "um número limitado de chaves"}
    </strong>
  );
};

/** The views the guides can use, by the tag name the MDX writes. */
const GUIDE_SPEC_VIEWS = {
  BaseUrl: BaseUrlView,
  IdempotentOperations: IdempotentOperationsView,
  MaxEndpoints: MaxEndpointsView,
  MaxKeys: MaxKeysView,
  OperationParameters: OperationParametersView,
  RateLimits: RateLimitsView,
  RetrySchedule: RetryScheduleView,
  RotationGrace: RotationGraceView,
  ScopeTable: ScopeTableView,
  SignatureTolerance: SignatureToleranceView,
  TopicTable: TopicTableView,
  WebhookHeaders: WebhookHeadersView,
} as const;

export { GUIDE_SPEC_VIEWS, SpecUnavailable, formatDuration };
