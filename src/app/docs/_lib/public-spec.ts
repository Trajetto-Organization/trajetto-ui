import { z } from "zod";
import { PUBLIC_ENV } from "@/env/names";

/**
 * The public OpenAPI document of the API, the only source of the reference.
 *
 * Read from `GET {API}/integration/docs/openapi.json` on the server, at
 * request time, through Next's data cache: a deploy of the API changes the
 * reference within minutes and nothing here copies the spec (decision 11.1).
 * When the API cannot answer, the pages say so and link the raw document
 * instead of showing a stale copy.
 */

interface JsonSchema {
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
  example?: unknown;
  examples?: unknown[];
  additionalProperties?: boolean | JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

interface ParameterObject {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema?: JsonSchema;
}

interface MediaTypeObject {
  schema?: JsonSchema;
  example?: unknown;
  examples?: Record<string, { value?: unknown }>;
}

interface HeaderObject {
  description?: string;
  schema?: JsonSchema;
}

interface ResponseObject {
  description?: string;
  headers?: Record<string, HeaderObject>;
  content?: Record<string, MediaTypeObject>;
}

interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: {
    required?: boolean;
    description?: string;
    content?: Record<string, MediaTypeObject>;
  };
  responses?: Record<string, ResponseObject>;
  security?: Array<Record<string, string[]>>;
  "x-scopes"?: string[];
}

interface ScopeEntry {
  scope: string;
  description: string;
  reserved: boolean;
}

interface TopicEntry {
  topic: string;
  family: "route" | "document";
  description: string;
  payload: string;
}

interface TrajettoAuthentication {
  header: string;
  scheme: string;
  key_format: string;
  max_active_keys_per_business: number;
  scopes: ScopeEntry[];
}

interface TrajettoLimits {
  window_seconds: number;
  key_per_minute_tenant_max: number;
  key_per_minute_platform_max: number;
  business_per_minute: number;
  invalid_keys_per_address_per_minute: number;
  service_unavailable_retry_after_seconds: number;
}

interface TrajettoWebhooks {
  version: string;
  timeout_seconds: number;
  retry_delays_seconds: number[];
  max_attempts: number;
  max_consecutive_failures: number;
  replay_window_days: number;
  max_endpoints_per_business: number;
  headers: Array<{ name: string; description: string }>;
  signature: {
    header: string;
    algorithm: string;
    version: string;
    secret_prefix: string;
    tolerance_seconds: number;
    rotation_grace_hours: number;
  };
  families: Array<{ family: "route" | "document"; wildcards: string[] }>;
  topics: TopicEntry[];
}

interface PublicSpec {
  openapi: string;
  info: { title?: string; version?: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  externalDocs?: { url: string; description?: string };
  tags?: Array<{ name: string; description?: string }>;
  paths: Record<string, Record<string, OperationObject>>;
  webhooks?: Record<string, Record<string, OperationObject>>;
  components?: {
    schemas?: Record<string, JsonSchema>;
    securitySchemes?: Record<
      string,
      { type?: string; scheme?: string; description?: string }
    >;
  };
  "x-trajetto-authentication"?: TrajettoAuthentication;
  "x-trajetto-limits"?: TrajettoLimits;
  "x-trajetto-webhooks"?: TrajettoWebhooks;
}

/** Only what the pages cannot render without; everything else is optional. */
const publicSpecShape = z
  .object({
    openapi: z.string().regex(/^3\./),
    info: z.object({}).passthrough(),
    paths: z.record(z.record(z.unknown())),
  })
  .passthrough();

function parsePublicSpec(value: unknown): PublicSpec | null {
  return publicSpecShape.safeParse(value).success
    ? (value as PublicSpec)
    : null;
}

const SPEC_PATH = "/integration/docs/openapi.json";

/** Five minutes, the same `max-age` the API sends on the document. */
const SPEC_REVALIDATE_SECONDS = 300;

/** A page waits this long for the API before rendering without it. */
const SPEC_TIMEOUT_MS = 8_000;

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

/**
 * The document, or null when the API is unreachable, slow or answers
 * something that is not the document. Never throws: a docs page must render
 * with or without it.
 */
async function fetchPublicSpec(
  apiBaseUrl: string | undefined = process.env.HTTP_REQUEST,
  fetchImpl: typeof fetch = fetch,
): Promise<PublicSpec | null> {
  if (!apiBaseUrl) return null;

  try {
    const response = await fetchImpl(joinUrl(apiBaseUrl, SPEC_PATH), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(SPEC_TIMEOUT_MS),
      // Time-based only: nothing in the web changes the API's document.
      next: { revalidate: SPEC_REVALIDATE_SECONDS },
    } as RequestInit);

    if (!response.ok) return null;

    return parsePublicSpec(await response.json());
  } catch {
    return null;
  }
}

/**
 * The API's public URL, as the document states it (`servers`), for links a
 * browser follows: the raw JSON and the console. The configured public URL
 * (PUBLIC_API_URL, read at run time) is only the fallback.
 */
function publicApiUrl(spec: PublicSpec | null): string | null {
  const fromSpec = spec?.servers?.[0]?.url;
  const fallback = process.env[PUBLIC_ENV.apiUrl]?.trim();
  const url = fromSpec || fallback;

  return url ? url.replace(/\/+$/, "") : null;
}

export {
  SPEC_PATH,
  SPEC_REVALIDATE_SECONDS,
  fetchPublicSpec,
  joinUrl,
  parsePublicSpec,
  publicApiUrl,
};
export type {
  HeaderObject,
  JsonSchema,
  MediaTypeObject,
  OperationObject,
  ParameterObject,
  PublicSpec,
  ResponseObject,
  ScopeEntry,
  TopicEntry,
  TrajettoAuthentication,
  TrajettoLimits,
  TrajettoWebhooks,
};
