import Link from "next/link";

import { ChevronRight, Lock, LockOpen } from "lucide-react";

import type { TocItem } from "@/lib/content/types";
import { cn } from "@/lib/utils";

import { Markdown } from "../../_lib/markdown";
import { docsGuideHref } from "../../_lib/navigation";
import {
  buildCurl,
  groupByTag,
  jsonMedia,
  mediaExample,
  requestExample,
  schemaRows,
  scopesOf,
  statusTone,
  typeLabel,
  webhooksOf,
  type ReferenceOperation,
  type ReferenceWebhook,
} from "../../_lib/openapi";
import type {
  JsonSchema,
  ParameterObject,
  PublicSpec,
  ResponseObject,
} from "../../_lib/public-spec";

import { CodeFrame } from "../code-block";
import {
  DOCS_CARD,
  DOCS_INLINE_CODE,
  DOCS_LINK,
  DOCS_SUBTITLE,
  DOCS_TABLE,
  DOCS_TABLE_FRAME,
  DOCS_TD,
  DOCS_TH,
  tableRegionProps,
} from "../docs-type";
import { specProseComponents } from "../spec-prose";

/**
 * The API reference, drawn from the public OpenAPI document on the server.
 *
 * Endpoints by tag, each with its scope, parameters, body, responses (with
 * schema, headers and example) and a curl line; then every webhook as the
 * request we make. Synchronous and given the document, so the page renders
 * the live one and the tests a fixture.
 */

const METHOD_TONES: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400",
  POST: "bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-400",
  PUT: "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-400",
  PATCH:
    "bg-violet-500/10 text-violet-700 ring-violet-500/30 dark:text-violet-400",
  DELETE: "bg-red-500/10 text-red-700 ring-red-500/30 dark:text-red-400",
};

const TAG_HEADING =
  "scroll-mt-[96px] font-site-display text-[clamp(26px,2.6vw,32px)] font-medium leading-[1.15] tracking-[-.025em] text-site-ink";

const MethodBadge = ({ method }: { method: string }) => (
  <span
    className={cn(
      "inline-flex h-6 min-w-[3.25rem] items-center justify-center rounded-[8px] px-2 font-site-mono text-[11px] font-medium tracking-[.04em] ring-1 ring-inset",
      METHOD_TONES[method] ?? "bg-site-soft2 text-site-ink ring-site-line2",
    )}
  >
    {method}
  </span>
);

const STATUS_TONES = {
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  redirect: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  client: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  server: "bg-red-500/10 text-red-700 dark:text-red-400",
} as const;

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-flex h-6 min-w-[2.75rem] items-center justify-center rounded-[8px] px-2 font-site-mono text-xs font-medium",
      STATUS_TONES[statusTone(status)],
    )}
  >
    {status}
  </span>
);

const IN_LABELS: Record<ParameterObject["in"], string> = {
  path: "Caminho",
  query: "Consulta",
  header: "Cabeçalho",
  cookie: "Cookie",
};

const SUBTITLE = DOCS_SUBTITLE;

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className={`break-all ${DOCS_INLINE_CODE} text-[12.5px]`}>
    {children}
  </code>
);

const RequiredTag = () => (
  <span className="ml-1.5 text-[11px] font-medium text-[#b91c1c] dark:text-[#f87171]">
    obrigatório
  </span>
);

const ParametersTable = ({
  spec,
  parameters,
  label,
}: {
  spec: PublicSpec;
  parameters: ParameterObject[];
  /** Names the region; unique on the page (axe landmark-unique). */
  label: string;
}) => (
  <div {...tableRegionProps(label)} className={DOCS_TABLE_FRAME}>
    <table className={`${DOCS_TABLE} min-w-[520px]`}>
      <thead>
        <tr>
          <th className={DOCS_TH}>Nome</th>
          <th className={DOCS_TH}>Onde</th>
          <th className={DOCS_TH}>Descrição</th>
        </tr>
      </thead>
      <tbody>
        {parameters.map((parameter) => {
          const values = (parameter.schema?.enum ?? []).filter(
            (value) => value !== null,
          );

          return (
            <tr key={`${parameter.in}-${parameter.name}`}>
              <td className={DOCS_TD}>
                <Code>{parameter.name}</Code>
                {parameter.required ? <RequiredTag /> : null}
                <div className="mt-1 font-site-mono text-[11px] text-site-muted">
                  {typeLabel(spec, parameter.schema)}
                </div>
              </td>
              <td className={`${DOCS_TD} !text-site-muted`}>
                {IN_LABELS[parameter.in]}
              </td>
              <td className={DOCS_TD}>
                <Markdown
                  source={parameter.description}
                  components={specProseComponents}
                />
                {values.length > 0 ? (
                  <p className="mt-1 text-xs text-site-muted">
                    Valores:{" "}
                    {values.map((value, index) => (
                      <span key={String(value)}>
                        {index > 0 ? ", " : ""}
                        <Code>{String(value)}</Code>
                      </span>
                    ))}
                  </p>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const SchemaTable = ({
  spec,
  schema,
  label = "Tabela: campos",
}: {
  spec: PublicSpec;
  schema: JsonSchema | undefined;
  /** Names the region; unique on the page (axe landmark-unique). */
  label?: string;
}) => {
  const rows = schemaRows(spec, schema);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-site-muted">
        Tipo <Code>{typeLabel(spec, schema)}</Code>.
      </p>
    );
  }

  return (
    <div {...tableRegionProps(label)} className={DOCS_TABLE_FRAME}>
      <table className={`${DOCS_TABLE} min-w-[520px]`}>
        <thead>
          <tr>
            <th className={DOCS_TH}>Campo</th>
            <th className={DOCS_TH}>Descrição</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td
                className={DOCS_TD}
                style={{ paddingLeft: `${1 + row.depth * 1.25}rem` }}
              >
                {row.depth > 0 ? (
                  <ChevronRight
                    className="-ml-4 mr-0.5 inline size-3 text-site-muted"
                    aria-hidden
                  />
                ) : null}
                <Code>{row.name}</Code>
                {row.required ? <RequiredTag /> : null}
                <div className="mt-1 font-site-mono text-[11px] text-site-muted">
                  {row.type}
                  {row.nullable ? " | null" : ""}
                </div>
              </td>
              <td className={DOCS_TD}>
                <Markdown
                  source={row.description}
                  components={specProseComponents}
                />
                {row.enumValues ? (
                  <p className="mt-1 text-xs text-site-muted">
                    Valores:{" "}
                    {row.enumValues.map((value, index) => (
                      <span key={value}>
                        {index > 0 ? ", " : ""}
                        <Code>{value}</Code>
                      </span>
                    ))}
                  </p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Markdown as one line of text, for a summary row (no block elements there). */
function plainText(source: string | undefined): string {
  return (source ?? "").replace(/[`*_]/g, "").replace(/\s+/g, " ").trim();
}

function exampleText(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value, null, 2);
}

const ResponseBlock = ({
  spec,
  status,
  response,
  context,
}: {
  spec: PublicSpec;
  status: string;
  response: ResponseObject;
  /** The operation's title, to name the response's table. */
  context: string;
}) => {
  const media = jsonMedia(response.content);
  const example = exampleText(mediaExample(spec, media));
  const headers = Object.entries(response.headers ?? {});

  return (
    <details className={`group ${DOCS_CARD} open:bg-site-soft`}>
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-[18px] px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40 [&::-webkit-details-marker]:hidden">
        <StatusBadge status={status} />
        <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-6 text-site-muted">
          {plainText(response.description) || "Sem descrição."}
        </span>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-site-muted transition-transform duration-200 group-open:rotate-90"
          aria-hidden
        />
      </summary>

      <div className="space-y-4 border-t border-site-line px-4 pb-4 pt-3">
        <Markdown
          source={response.description}
          components={specProseComponents}
        />

        {media?.schema ? (
          <div>
            <p className={SUBTITLE}>Corpo</p>
            <SchemaTable
              spec={spec}
              schema={media.schema}
              label={`Resposta ${status}: ${context}`}
            />
          </div>
        ) : null}

        {headers.length > 0 ? (
          <div>
            <p className={SUBTITLE}>Cabeçalhos</p>
            <ul className="space-y-2">
              {headers.map(([name, header]) => (
                <li key={name} className="text-sm">
                  <Code>{name}</Code>
                  <div className="mt-1">
                    <Markdown
                      source={header.description}
                      components={specProseComponents}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {example ? (
          <CodeFrame
            code={example}
            language="json"
            title="Exemplo"
            className="my-0"
          />
        ) : null}
      </div>
    </details>
  );
};

const ScopeLine = ({
  operation,
}: {
  operation: ReferenceOperation["operation"];
}) => {
  const scopes = scopesOf(operation);

  if (scopes === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-site-muted">
        <LockOpen className="size-4" aria-hidden />
        Sem chave: aberto a qualquer um.
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-site-muted">
      <Lock className="size-4" aria-hidden />
      Chave de API
      {scopes.length > 0 ? (
        <>
          {" "}
          com o escopo{" "}
          {scopes.map((scope) => (
            <Code key={scope}>{scope}</Code>
          ))}
        </>
      ) : null}
    </p>
  );
};

const OperationSection = ({
  spec,
  serverUrl,
  entry,
}: {
  spec: PublicSpec;
  serverUrl: string;
  entry: ReferenceOperation;
}) => {
  const { operation } = entry;
  const parameters = operation.parameters ?? [];
  const body = jsonMedia(operation.requestBody?.content);
  // Only the document's own example: a body the reader sends is never invented.
  const bodyExample = exampleText(requestExample(body));
  const title = operation.summary ?? `${entry.method} ${entry.path}`;

  return (
    <section
      aria-labelledby={entry.anchor}
      className="border-t border-site-line py-10 first:border-t-0 first:pt-4"
    >
      <h3
        id={entry.anchor}
        className="scroll-mt-[96px] text-[21px] font-semibold leading-[1.3] tracking-[-.015em] text-site-ink"
      >
        {title}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MethodBadge method={entry.method} />
        <code className="break-all font-site-mono text-[13.5px] text-site-ink">
          {entry.path}
        </code>
      </div>

      <div className="mt-3">
        <ScopeLine operation={operation} />
      </div>

      {operation.description ? (
        <div className="mt-4">
          <Markdown
            source={operation.description}
            components={specProseComponents}
          />
        </div>
      ) : null}

      <CodeFrame
        code={buildCurl(spec, serverUrl, entry)}
        language="bash"
        title="Exemplo com curl"
      />

      {parameters.length > 0 ? (
        <div>
          <p className={SUBTITLE}>Parâmetros</p>
          <ParametersTable
            spec={spec}
            parameters={parameters}
            label={`Parâmetros: ${title}`}
          />
        </div>
      ) : null}

      {body ? (
        <div>
          <p className={SUBTITLE}>Corpo da requisição</p>
          <Markdown
            source={operation.requestBody?.description}
            components={specProseComponents}
          />
          <SchemaTable
            spec={spec}
            schema={body.schema}
            label={`Corpo da requisição: ${title}`}
          />
          {bodyExample ? (
            <CodeFrame
              code={bodyExample}
              language="json"
              title="Exemplo de corpo"
            />
          ) : null}
        </div>
      ) : null}

      <p className={SUBTITLE}>Respostas</p>
      <div className="space-y-2">
        {Object.entries(operation.responses ?? {}).map(([status, response]) => (
          <ResponseBlock
            key={status}
            spec={spec}
            status={status}
            response={response}
            context={title}
          />
        ))}
      </div>
    </section>
  );
};

const WebhookSection = ({
  spec,
  webhook,
}: {
  spec: PublicSpec;
  webhook: ReferenceWebhook;
}) => {
  const { operation } = webhook;
  const body = jsonMedia(operation.requestBody?.content);
  const example = exampleText(mediaExample(spec, body));
  const headers = (operation.parameters ?? []).filter(
    (parameter) => parameter.in === "header",
  );

  return (
    <section
      aria-labelledby={webhook.anchor}
      className="border-t border-site-line py-10 first:border-t-0 first:pt-4"
    >
      <h3
        id={webhook.anchor}
        className="scroll-mt-[96px] font-site-mono text-[17px] font-medium text-site-ink"
      >
        {webhook.topic}
      </h3>

      {operation.summary ? (
        <p className="mt-2 text-[15px] text-site-ink">{operation.summary}</p>
      ) : null}

      {operation.description ? (
        <div className="mt-3">
          <Markdown
            source={operation.description}
            components={specProseComponents}
          />
        </div>
      ) : null}

      {headers.length > 0 ? (
        <div>
          <p className={SUBTITLE}>Cabeçalhos que enviamos</p>
          <ParametersTable
            spec={spec}
            parameters={headers}
            label={`Cabeçalhos: ${webhook.topic}`}
          />
        </div>
      ) : null}

      {body ? (
        <div>
          <p className={SUBTITLE}>Corpo</p>
          <SchemaTable
            spec={spec}
            schema={body.schema}
            label={`Corpo: ${webhook.topic}`}
          />
          {example ? (
            <CodeFrame
              code={example}
              language="json"
              title="Exemplo de corpo"
            />
          ) : null}
        </div>
      ) : null}

      <p className={SUBTITLE}>O que a sua resposta significa</p>
      <div className="space-y-2">
        {Object.entries(operation.responses ?? {}).map(([status, response]) => (
          <div
            key={status}
            className={`flex items-start gap-3 ${DOCS_CARD} px-4 py-3`}
          >
            <StatusBadge status={status} />
            <div className="min-w-0 flex-1">
              <Markdown
                source={response.description}
                components={specProseComponents}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/** "Nesta página" for the reference: tags, then their endpoints; webhooks last. */
function referenceToc(spec: PublicSpec): TocItem[] {
  const webhooks = webhooksOf(spec);

  return [
    ...groupByTag(spec).flatMap((tag) => [
      { id: tag.anchor, text: tag.name, level: 2 as const },
      ...tag.operations.map((entry) => ({
        id: entry.anchor,
        text: entry.operation.summary ?? `${entry.method} ${entry.path}`,
        level: 3 as const,
      })),
    ]),
    ...(webhooks.length > 0
      ? [
          { id: "webhooks", text: "Webhooks", level: 2 as const },
          ...webhooks.map((webhook) => ({
            id: webhook.anchor,
            text: webhook.topic,
            level: 3 as const,
          })),
        ]
      : []),
  ];
}

const ReferenceView = ({
  spec,
  serverUrl,
}: {
  spec: PublicSpec;
  serverUrl: string;
}) => {
  const webhooks = webhooksOf(spec);

  return (
    <div>
      {groupByTag(spec).map((tag) => (
        <section
          key={tag.anchor}
          aria-labelledby={tag.anchor}
          className="mt-14 first:mt-8"
        >
          <h2 id={tag.anchor} className={TAG_HEADING}>
            {tag.name}
          </h2>
          {tag.description ? (
            <div className="mt-2 max-w-2xl">
              <Markdown
                source={tag.description}
                components={specProseComponents}
              />
            </div>
          ) : null}

          <div className="mt-4">
            {tag.operations.map((entry) => (
              <OperationSection
                key={entry.anchor}
                spec={spec}
                serverUrl={serverUrl}
                entry={entry}
              />
            ))}
          </div>
        </section>
      ))}

      {webhooks.length > 0 ? (
        <section aria-labelledby="webhooks" className="mt-14">
          <h2 id="webhooks" className={TAG_HEADING}>
            Webhooks
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-site-muted">
            As chamadas que o Trajetto faz ao endpoint que você cadastrou, uma
            por tópico. Antes de confiar no corpo,{" "}
            <Link href={docsGuideHref("assinatura")} className={DOCS_LINK}>
              verifique a assinatura
            </Link>
            .
          </p>

          <div className="mt-4">
            {webhooks.map((webhook) => (
              <WebhookSection
                key={webhook.anchor}
                spec={spec}
                webhook={webhook}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export { MethodBadge, ReferenceView, SchemaTable, referenceToc };
