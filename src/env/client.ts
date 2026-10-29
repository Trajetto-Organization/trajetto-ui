/**
 * How code that may run in the browser reads the public configuration.
 *
 * Never `process.env.NEXT_PUBLIC_*` (tests/unitaires/public-config-scan.test.ts
 * fails on one): that is inlined at build, and the image is promoted from
 * staging to production (decision 12.2).
 *
 * In the browser the value comes from the JSON element the root layout
 * renders per request. A prerendered page (the landing page, /login, the
 * blog) has no such element, because its HTML was made at build time, so the
 * first read there fetches /public-config.json once. On the server (a client
 * component rendering there) it is read from the environment.
 */
import {
  PUBLIC_CONFIG_ELEMENT_ID,
  PUBLIC_CONFIG_PATH,
  parsePublicConfig,
  readPublicConfig,
  type PublicConfig,
} from "./public-config";

let fetched: PublicConfig | null = null;
let inflight: Promise<PublicConfig> | null = null;

const listeners = new Set<() => void>();

// Keyed by the element's text: useSyncExternalStore needs the same object
// back while nothing changed, and a test may swap the element.
let parsedDocument: { text: string; config: PublicConfig | null } | null = null;

function fromDocument(): PublicConfig | null {
  const text = document.getElementById(PUBLIC_CONFIG_ELEMENT_ID)?.textContent;

  if (!text) return null;
  if (parsedDocument?.text === text) return parsedDocument.config;

  let config: PublicConfig | null = null;

  try {
    config = readPublicConfig(JSON.parse(text));
  } catch {
    config = null;
  }

  parsedDocument = { text, config };

  return config;
}

/** A real document to read from (not the server, nor a stubbed window). */
function inBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function fromServerEnv(): PublicConfig | null {
  const result = parsePublicConfig(process.env);

  return result.ok ? result.config : null;
}

/** The configuration if it is already at hand, or null. Never fetches. */
function getPublicConfig(): PublicConfig | null {
  if (!inBrowser()) return fromServerEnv();

  return fromDocument() ?? fetched;
}

async function fetchPublicConfig(): Promise<PublicConfig> {
  const response = await fetch(PUBLIC_CONFIG_PATH, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Configuração pública indisponível (HTTP ${response.status})`,
    );
  }

  const config = readPublicConfig(await response.json());

  if (!config) throw new Error("Configuração pública inválida");

  return config;
}

/** The configuration, fetched once when the page did not carry it. */
async function loadPublicConfig(): Promise<PublicConfig> {
  const known = getPublicConfig();

  if (known) return known;

  if (!inBrowser()) {
    throw new Error(
      "Configuração pública ausente no servidor: confira PUBLIC_API_URL",
    );
  }

  inflight ??= fetchPublicConfig()
    .then((config) => {
      fetched = config;
      listeners.forEach((listener) => listener());

      return config;
    })
    .finally(() => {
      // A failure is retried by the next caller, not cached.
      inflight = null;
    });

  return inflight;
}

/**
 * The API's public URL, without trailing slash. Call sites keep the shape
 * `${await publicApiUrl()}/path` so scripts/check-api-routes.mjs still reads
 * the path they call.
 */
async function publicApiUrl(): Promise<string> {
  return (await loadPublicConfig()).apiUrl;
}

/** For useSyncExternalStore: notified when a fetched configuration lands. */
function subscribePublicConfig(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export {
  getPublicConfig,
  loadPublicConfig,
  publicApiUrl,
  subscribePublicConfig,
};
export type { PublicConfig };
