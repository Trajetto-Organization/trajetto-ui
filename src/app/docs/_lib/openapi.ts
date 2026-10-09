import type {
  JsonSchema,
  MediaTypeObject,
  OperationObject,
  ParameterObject,
  PublicSpec,
} from "./public-spec";

/**
 * Reading the public OpenAPI document for the reference pages.
 *
 * Pure functions over the document the API serves: grouping by tag, resolving
 * `$ref`, flattening a schema into rows, building an example and a curl line.
 * Nothing here knows an endpoint by name, so a route the API adds (like the
 * write of decision 5.10) shows up with no change on this side.
 */

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

interface ReferenceOperation {
  anchor: string;
  method: string;
  path: string;
  operation: OperationObject;
}

interface ReferenceTag {
  name: string;
  anchor: string;
  description?: string;
  operations: ReferenceOperation[];
}

interface ReferenceWebhook {
  anchor: string;
  topic: string;
  operation: OperationObject;
}

/** "Entregas" → "entregas", "listDeliveries" → "listdeliveries", no accents. */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function operationAnchor(
  method: string,
  path: string,
  operation: OperationObject,
): string {
  return slugify(operation.operationId ?? `${method}-${path}`);
}

/** Every operation, under the tags in the order the document lists them. */
function groupByTag(spec: PublicSpec): ReferenceTag[] {
  const tags = new Map<string, ReferenceTag>();

  for (const tag of spec.tags ?? []) {
    tags.set(tag.name, {
      name: tag.name,
      anchor: slugify(tag.name),
      description: tag.description,
      operations: [],
    });
  }

  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = item[method];

      if (!operation) continue;

      const tagName = operation.tags?.[0] ?? "Outros";

      if (!tags.has(tagName)) {
        tags.set(tagName, {
          name: tagName,
          anchor: slugify(tagName),
          operations: [],
        });
      }

      tags.get(tagName)!.operations.push({
        anchor: operationAnchor(method, path, operation),
        method: method.toUpperCase(),
        path,
        operation,
      });
    }
  }

  return [...tags.values()].filter((tag) => tag.operations.length > 0);
}

/** The reference's anchor for a topic; the guides link to it. */
function webhookAnchor(topic: string): string {
  return `webhook-${slugify(topic)}`;
}

function webhooksOf(spec: PublicSpec): ReferenceWebhook[] {
  return Object.entries(spec.webhooks ?? {}).flatMap(([topic, item]) => {
    const operation = item.post;

    return operation
      ? [{ anchor: webhookAnchor(topic), topic, operation }]
      : [];
  });
}

function allOperations(spec: PublicSpec): ReferenceOperation[] {
  return groupByTag(spec).flatMap((tag) => tag.operations);
}

function findOperation(
  spec: PublicSpec,
  operationId: string,
): ReferenceOperation | undefined {
  return allOperations(spec).find(
    (entry) => entry.operation.operationId === operationId,
  );
}

/** Header parameters are case-insensitive; the document spells them in lower case. */
function headerParameter(
  operation: OperationObject,
  name: string,
): ParameterObject | undefined {
  return (operation.parameters ?? []).find(
    (parameter) =>
      parameter.in === "header" &&
      parameter.name.toLowerCase() === name.toLowerCase(),
  );
}

function refName(ref: string): string {
  return ref.split("/").pop() ?? ref;
}

/** Follows `#/components/schemas/X`, a few levels deep at most. */
function resolveSchema(
  spec: PublicSpec,
  schema: JsonSchema | undefined,
  depth = 0,
): JsonSchema {
  if (!schema) return {};
  if (!schema.$ref || depth > 5) return schema;

  const target = spec.components?.schemas?.[refName(schema.$ref)];

  if (!target) return schema;

  // Siblings of a $ref (3.1) describe this use of it, so they win.
  const { $ref: _ref, ...siblings } = schema;

  return resolveSchema(spec, { ...target, ...siblings }, depth + 1);
}

function typesOf(schema: JsonSchema): string[] {
  return ([] as string[]).concat(schema.type ?? []);
}

function isNullable(schema: JsonSchema): boolean {
  return (
    typesOf(schema).includes("null") ||
    [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].some((branch) =>
      typesOf(branch).includes("null"),
    ) ||
    (schema.enum ?? []).includes(null)
  );
}

/** "string", "string (date-time)", "objeto", "WebhookRouteData", "string[]". */
function typeLabel(spec: PublicSpec, schema: JsonSchema | undefined): string {
  if (!schema) return "qualquer";

  if (schema.$ref) return refName(schema.$ref);

  const branches = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].filter(
    (branch) => !typesOf(branch).includes("null") || typesOf(branch).length > 1,
  );

  if (branches.length > 0) {
    const labels = [
      ...new Set(branches.map((branch) => typeLabel(spec, branch))),
    ];

    // A zod union of a string and an ISO string reads better as one type.
    const formatted = labels.filter((label) => label.startsWith("string ("));

    if (
      labels.every((label) => label.startsWith("string")) &&
      formatted.length === 1
    ) {
      return formatted[0];
    }

    return labels.join(" | ");
  }

  const types = typesOf(schema).filter((type) => type !== "null");

  if (types.includes("array")) {
    return `${typeLabel(spec, schema.items)}[]`;
  }

  if (types.length === 0) {
    if (schema.properties) return "objeto";
    if (schema.enum) return "enum";

    return "qualquer";
  }

  return types
    .map((type) => {
      if (type === "object") return "objeto";
      if (type === "string" && schema.format)
        return `string (${schema.format})`;

      return type;
    })
    .join(" | ");
}

interface SchemaRow {
  /** Dotted path from the root, for a stable key. */
  key: string;
  name: string;
  depth: number;
  type: string;
  required: boolean;
  nullable: boolean;
  description?: string;
  enumValues?: string[];
}

/** The object behind a property: itself, or its items when it is an array. */
function nestedObject(spec: PublicSpec, schema: JsonSchema): JsonSchema | null {
  const resolved = resolveSchema(spec, schema);

  if (resolved.properties) return resolved;

  if (typesOf(resolved).includes("array") && resolved.items) {
    const items = resolveSchema(spec, resolved.items);

    return items.properties ? items : null;
  }

  const branch = [...(resolved.anyOf ?? []), ...(resolved.oneOf ?? [])]
    .map((option) => resolveSchema(spec, option))
    .find((option) => option.properties);

  return branch ?? null;
}

const MAX_DEPTH = 6;

/** A schema as the rows of a table, nested objects indented under their field. */
function schemaRows(
  spec: PublicSpec,
  schema: JsonSchema | undefined,
  depth = 0,
  prefix = "",
): SchemaRow[] {
  const object = schema ? nestedObject(spec, schema) : null;

  if (!object?.properties || depth > MAX_DEPTH) return [];

  const required = new Set(object.required ?? []);

  return Object.entries(object.properties).flatMap(([name, property]) => {
    const resolved = resolveSchema(spec, property);
    const key = prefix ? `${prefix}.${name}` : name;
    const enumValues = (resolved.enum ?? [])
      .filter((value) => value !== null)
      .map((value) => String(value));

    const row: SchemaRow = {
      key,
      name,
      depth,
      type: typeLabel(spec, property.$ref ? property : resolved),
      required: required.has(name),
      nullable: isNullable(resolved),
      description: property.description ?? resolved.description,
      ...(enumValues.length > 0 && { enumValues }),
    };

    return [row, ...schemaRows(spec, property, depth + 1, key)];
  });
}

const EXAMPLE_UUID = "0192f7f0-5c1e-7a3b-9d2e-4f6a8b0c1d2e";

function stringExample(schema: JsonSchema, name?: string): string {
  switch (schema.format) {
    case "date-time":
      return "2026-09-29T12:00:00.000Z";
    case "date":
      return "2026-09-29";
    case "uuid":
      return EXAMPLE_UUID;
    case "uri":
    case "url":
      return "https://exemplo.com.br";
    default:
      break;
  }

  if (name && /(^id$|_id$)/.test(name)) return EXAMPLE_UUID;
  if (name && /(_at$)/.test(name)) return "2026-09-29T12:00:00.000Z";

  return "texto";
}

/** A plausible body for a schema, when the document carries no example. */
function exampleFor(
  spec: PublicSpec,
  schema: JsonSchema | undefined,
  depth = 0,
  name?: string,
): unknown {
  if (!schema || depth > MAX_DEPTH) return null;

  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.examples) && schema.examples.length > 0)
    return schema.examples[0];

  const resolved = resolveSchema(spec, schema);

  if (resolved !== schema) return exampleFor(spec, resolved, depth + 1, name);

  if (resolved.const !== undefined) return resolved.const;

  const enumValue = (resolved.enum ?? []).find((value) => value !== null);

  if (enumValue !== undefined) return enumValue;

  const branch = [...(resolved.anyOf ?? []), ...(resolved.oneOf ?? [])].find(
    (option) => !typesOf(option).every((type) => type === "null"),
  );

  if (branch) return exampleFor(spec, branch, depth + 1, name);

  const types = typesOf(resolved).filter((type) => type !== "null");
  const type = types[0] ?? (resolved.properties ? "object" : undefined);

  switch (type) {
    case "object":
      return Object.fromEntries(
        Object.entries(resolved.properties ?? {}).map(([key, property]) => [
          key,
          exampleFor(spec, property, depth + 1, key),
        ]),
      );
    case "array":
      return [exampleFor(spec, resolved.items, depth + 1, name)];
    case "string":
      return stringExample(resolved, name);
    case "integer":
    case "number":
      return typeof resolved.minimum === "number" ? resolved.minimum : 1;
    case "boolean":
      return true;
    default:
      return null;
  }
}

/** The example the document itself gives for a body, and nothing invented. */
function documentedExample(media: MediaTypeObject | undefined): unknown {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;

  const named = Object.values(media.examples ?? {})[0]?.value;

  if (named !== undefined) return named;

  if (media.schema?.example !== undefined) return media.schema.example;
  if (Array.isArray(media.schema?.examples)) return media.schema.examples[0];

  return undefined;
}

/**
 * A body to SHOW: the document's example, or one built from the schema. Only
 * for what the API sends (responses, webhooks), which a reader looks at.
 */
function mediaExample(
  spec: PublicSpec,
  media: MediaTypeObject | undefined,
): unknown {
  const documented = documentedExample(media);

  if (documented !== undefined) return documented;

  return media?.schema ? exampleFor(spec, media.schema) : undefined;
}

/**
 * A body to SEND: only the document's example. One built from the schema
 * cannot know the rules the schema does not state (one shipper field, not
 * both; a CNPJ with valid check digits) nor the patterns it ignores, and a
 * reader pastes it: the write's invented body came back 400 with nine issues.
 */
function requestExample(media: MediaTypeObject | undefined): unknown {
  return documentedExample(media);
}

function jsonMedia(
  content: Record<string, MediaTypeObject> | undefined,
): MediaTypeObject | undefined {
  if (!content) return undefined;

  return content["application/json"] ?? Object.values(content)[0];
}

/** The scopes an operation asks for, from its security requirement. */
function scopesOf(operation: OperationObject): string[] | null {
  const requirement = (operation.security ?? []).find(
    (entry) => "apiKey" in entry,
  );

  if (!requirement) return null;

  return requirement.apiKey ?? [];
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** A curl line a reader can paste, with the key and the id as variables. */
function buildCurl(
  spec: PublicSpec,
  serverUrl: string,
  entry: Pick<ReferenceOperation, "method" | "path" | "operation">,
): string {
  const { method, path, operation } = entry;
  const parameters = operation.parameters ?? [];

  const url = path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const parameter = parameters.find(
      (candidate) => candidate.in === "path" && candidate.name === name,
    );

    return encodeURIComponent(
      String(exampleFor(spec, parameter?.schema, 0, name) ?? name),
    );
  });

  const query = parameters
    .filter((parameter) => parameter.in === "query" && parameter.required)
    .map(
      (parameter) =>
        `${encodeURIComponent(parameter.name)}=${encodeURIComponent(String(exampleFor(spec, parameter.schema, 0, parameter.name)))}`,
    )
    .join("&");

  const lines = [
    `curl${method === "GET" ? "" : ` -X ${method}`} "${serverUrl}${url}${query ? `?${query}` : ""}"`,
  ];

  if (scopesOf(operation) !== null) {
    lines.push('-H "Authorization: Bearer $TRAJETTO_API_KEY"');
  }

  // A variable set once, not `$(uuidgen)`: a key generated inside the
  // command is a new key on every paste, so a retry would duplicate.
  const idempotent = Boolean(headerParameter(operation, "idempotency-key"));

  if (idempotent) {
    lines.push('-H "Idempotency-Key: $IDEMPOTENCY_KEY"');
  }

  const body = jsonMedia(operation.requestBody?.content);
  const bodyExample = requestExample(body);
  const preamble: string[] = [];

  if (idempotent) {
    preamble.push(
      'IDEMPOTENCY_KEY="pedido-10452" # um valor por documento; repita o mesmo em toda nova tentativa dele',
    );
  }

  if (body) {
    lines.push('-H "Content-Type: application/json"');

    if (bodyExample === undefined) {
      // No example in the document: point at a file rather than invent values.
      preamble.push(
        '# corpo.json: um objeto com os campos de "Corpo da requisição", abaixo',
      );
      lines.push("--data @corpo.json");
    } else {
      lines.push(`--data ${shellQuote(JSON.stringify(bodyExample, null, 2))}`);
    }
  }

  return [...preamble, lines.join(" \\\n  ")].join("\n");
}

type StatusTone = "success" | "redirect" | "client" | "server";

function statusTone(status: string): StatusTone {
  const first = status.charAt(0);

  if (first === "2") return "success";
  if (first === "3") return "redirect";
  if (first === "4") return "client";

  return "server";
}

export {
  EXAMPLE_UUID,
  allOperations,
  buildCurl,
  exampleFor,
  findOperation,
  groupByTag,
  headerParameter,
  isNullable,
  jsonMedia,
  mediaExample,
  operationAnchor,
  requestExample,
  resolveSchema,
  schemaRows,
  scopesOf,
  slugify,
  statusTone,
  typeLabel,
  webhookAnchor,
  webhooksOf,
};
export type {
  ReferenceOperation,
  ReferenceTag,
  ReferenceWebhook,
  SchemaRow,
  StatusTone,
};
