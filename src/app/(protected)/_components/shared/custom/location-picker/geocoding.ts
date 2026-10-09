import type {
  NominatimSearchResult,
  ReverseGeocodingResult,
} from "./location-picker.types";

/**
 * The location picker's geocoder: the public Nominatim, called from the
 * browser (decision 15.25 keeps it there; 16.800-16.805 record the usage-policy
 * measures below). Every request is Brazil-only, in Portuguese, debounced,
 * at least three characters long and at most one per second per tab — the
 * limits Nominatim's usage policy sets for a client like this one.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const VIACEP_URL = "https://viacep.com.br/ws";

const MIN_QUERY_LENGTH = 3;
/** A pause in typing, not every keystroke, triggers a search. */
const SEARCH_DEBOUNCE_MS = 500;
/** Nominatim's policy: an absolute maximum of one request per second. */
const MIN_REQUEST_INTERVAL_MS = 1000;
const SEARCH_LIMIT = 8;

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type StructuredQuery = { street?: string; city: string; state: string };

class GeocodingError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GeocodingError";
  }
}

const NETWORK_ERROR_MESSAGE =
  "Não foi possível buscar o endereço agora. Verifique sua conexão e tente de novo.";

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/** Trimmed, with runs of spaces collapsed: "  Rua  X " and "Rua X" are one search. */
function normalizeSearchQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

/** The eight digits when the whole query is a CEP ("01310-100", "01310100", "01.310-100"). */
function extractCep(query: string): string | null {
  const normalized = normalizeSearchQuery(query);

  if (!/^\d{2}\.?\d{3}-?\d{3}$/.test(normalized)) return null;

  return normalized.replace(/\D/g, "");
}

function isSearchableQuery(query: string): boolean {
  return normalizeSearchQuery(query).length >= MIN_QUERY_LENGTH;
}

function baseParams(): URLSearchParams {
  return new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    // The product is Brazil-only: "Toledo" is the town in Paraná, not Spain.
    countrycodes: "br",
    "accept-language": "pt-BR",
    limit: String(SEARCH_LIMIT),
  });
}

/** A free-text search, or a structured one (what a CEP resolves to). */
function buildSearchUrl(query: string | StructuredQuery): string {
  const params = baseParams();

  if (typeof query === "string") {
    params.set("q", normalizeSearchQuery(query));
  } else {
    if (query.street) params.set("street", query.street);
    params.set("city", query.city);
    params.set("state", query.state);
  }

  return `${NOMINATIM_URL}/search?${params.toString()}`;
}

function buildReverseUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "pt-BR",
  });

  return `${NOMINATIM_URL}/reverse?${params.toString()}`;
}

/**
 * Brazilian results only, each address once. Nominatim returns the same
 * place twice when OSM maps it as two objects (a town's node and boundary),
 * and the list showed both.
 */
function dedupeResults(
  results: NominatimSearchResult[],
): NominatimSearchResult[] {
  const seen = new Set<string>();

  return results.filter((result) => {
    const country = result.address?.country_code;
    if (country && country !== "br") return false;

    const key = result.display_name;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

/** Lower case, no accents: "São José" and "sao jose" compare equal. */
function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Words that say what kind of place it is, not which one. */
const GENERIC_WORDS = new Set([
  "rua",
  "avenida",
  "travessa",
  "alameda",
  "estrada",
  "rodovia",
  "praca",
  "largo",
  "bairro",
  "cidade",
  "dos",
  "das",
  "para",
]);

/**
 * True when the first result shares no name with what was typed: OSM found
 * nothing by that name and answered something else ("Curitba", a typo, came
 * back as a street in Boa Vista, Roraima). The list then must not highlight
 * it, or Enter picks a place 3,000 km away. A CEP is never weak: its results
 * are what the CEP resolved to, not its digits.
 */
function isWeakMatch(query: string, results: NominatimSearchResult[]): boolean {
  if (results.length === 0 || extractCep(query)) return false;

  const tokens = foldText(normalizeSearchQuery(query))
    .split(/[^a-z0-9]+/)
    .filter(
      (token) =>
        token.length >= 3 && !/^\d+$/.test(token) && !GENERIC_WORDS.has(token),
    );

  if (tokens.length === 0) return false;

  const first = foldText(results[0].display_name);
  return !tokens.some((token) => first.includes(token));
}

/**
 * Lets a request out at least `interval` ms after the previous one that
 * actually went out. One per tab: every picker on the page shares it, as they
 * share Nominatim's quota. Measured from real sends, not reservations, so a
 * search replaced while it waited (aborted) does not hold a slot and push the
 * next one back.
 */
function createRequestThrottle(
  interval: number,
  now: () => number = () => Date.now(),
  wait: (ms: number) => Promise<void> = (ms) =>
    new Promise((done) => setTimeout(done, ms)),
) {
  let lastSent = Number.NEGATIVE_INFINITY;

  return async function throttle(signal?: AbortSignal): Promise<void> {
    for (;;) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const remaining = lastSent + interval - now();

      if (remaining <= 0) {
        lastSent = now();
        return;
      }

      await wait(remaining);
    }
  };
}

const nominatimThrottle = createRequestThrottle(MIN_REQUEST_INTERVAL_MS);

async function getJson<T>(
  url: string,
  fetcher: Fetcher,
  signal: AbortSignal | undefined,
  throttle?: (signal?: AbortSignal) => Promise<void>,
): Promise<T> {
  await throttle?.(signal);

  let response: Response;

  try {
    response = await fetcher(url, {
      signal,
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
  } catch (error) {
    // A replaced search aborts on purpose; callers ignore that, so keep it as is.
    if (isAbortError(error)) throw error;
    // Offline, DNS or CORS failures reject with the browser's English text
    // ("Failed to fetch"); the user sees a pt-BR sentence instead.
    throw new GeocodingError(NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    throw new GeocodingError(
      response.status === 429
        ? "Muitas buscas seguidas. Aguarde alguns segundos e tente de novo."
        : "Não foi possível buscar o endereço agora. Tente de novo.",
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (isAbortError(error)) throw error;
    // A captive portal or proxy answering HTML: same pt-BR sentence, not a parser error.
    throw new GeocodingError(NETWORK_ERROR_MESSAGE);
  }
}

/** What the list shows for a failed search: only messages written for the user. */
function geocodingErrorMessage(error: unknown): string {
  return error instanceof GeocodingError
    ? error.message
    : NETWORK_ERROR_MESSAGE;
}

type ViaCepAnswer = {
  erro?: boolean | string;
  logradouro?: string;
  localidade?: string;
  estado?: string;
  uf?: string;
};

interface SearchOptions {
  fetcher?: Fetcher;
  signal?: AbortSignal;
  throttle?: (signal?: AbortSignal) => Promise<void>;
}

type ResolvedOptions = SearchOptions &
  Required<Pick<SearchOptions, "fetcher" | "throttle">>;

/**
 * OSM barely knows Brazilian CEPs (a CEP from Manaus came back as a street
 * in Belo Horizonte), so a CEP is resolved by ViaCEP and its street, city
 * and state are searched instead; a CEP of a whole town has no street.
 */
async function searchByCep(
  cep: string,
  options: ResolvedOptions,
): Promise<NominatimSearchResult[]> {
  const answer = await getJson<ViaCepAnswer>(
    `${VIACEP_URL}/${cep}/json/`,
    options.fetcher,
    options.signal,
  );

  if (answer.erro || !answer.localidade) return [];

  const city = answer.localidade;
  const state = answer.estado || answer.uf || "";
  const street = answer.logradouro || undefined;

  const found = await getJson<NominatimSearchResult[]>(
    buildSearchUrl({ street, city, state }),
    options.fetcher,
    options.signal,
    options.throttle,
  );

  if (found.length > 0 || !street) return found;

  // The street is not in OSM yet: the town is still a useful place to start.
  return getJson<NominatimSearchResult[]>(
    buildSearchUrl({ city, state }),
    options.fetcher,
    options.signal,
    options.throttle,
  );
}

/**
 * A CEP's street is often long (Av. Paulista spans a dozen CEPs): the
 * segments whose CEP shares more leading digits with the one typed come
 * first, the rest keep Nominatim's order.
 */
function rankByCep(
  results: NominatimSearchResult[],
  cep: string,
): NominatimSearchResult[] {
  const closeness = (result: NominatimSearchResult): number => {
    const digits = (result.address?.postcode ?? "").replace(/\D/g, "");
    let shared = 0;

    while (shared < cep.length && digits[shared] === cep[shared]) shared += 1;

    return shared;
  };

  return results
    .map((result, index) => ({ result, index, score: closeness(result) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ result }) => result);
}

async function searchAddresses(
  query: string,
  options: SearchOptions = {},
): Promise<NominatimSearchResult[]> {
  if (!isSearchableQuery(query)) return [];

  const resolved: ResolvedOptions = {
    ...options,
    fetcher: options.fetcher ?? ((input, init) => fetch(input, init)),
    throttle: options.throttle ?? nominatimThrottle,
  };

  const cep = extractCep(query);
  const results = cep
    ? rankByCep(await searchByCep(cep, resolved), cep)
    : await getJson<NominatimSearchResult[]>(
        buildSearchUrl(query),
        resolved.fetcher,
        resolved.signal,
        resolved.throttle,
      );

  return dedupeResults(results);
}

async function reverseGeocode(
  lat: number,
  lng: number,
  options: SearchOptions = {},
): Promise<ReverseGeocodingResult> {
  return getJson<ReverseGeocodingResult>(
    buildReverseUrl(lat, lng),
    options.fetcher ?? ((input, init) => fetch(input, init)),
    options.signal,
    options.throttle ?? nominatimThrottle,
  );
}

export {
  GeocodingError,
  MIN_QUERY_LENGTH,
  MIN_REQUEST_INTERVAL_MS,
  NOMINATIM_URL,
  SEARCH_DEBOUNCE_MS,
  SEARCH_LIMIT,
  buildReverseUrl,
  buildSearchUrl,
  createRequestThrottle,
  dedupeResults,
  extractCep,
  geocodingErrorMessage,
  isSearchableQuery,
  isWeakMatch,
  normalizeSearchQuery,
  rankByCep,
  reverseGeocode,
  searchAddresses,
};
export type { Fetcher, StructuredQuery };
