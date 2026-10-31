/**
 * The third-party services the screens call from the browser, answered here.
 *
 * The browser suites are the gate of the staging image, and every service
 * outside the runner they touched made the gate depend on somebody else's
 * day: OpenStreetMap's tiles (the map specs waited for a drawn tile),
 * Cloudflare's Turnstile script (every login went through it), ViaCEP (the
 * journeys typed a CEP), Nominatim (the location picker) and jsDelivr (the
 * API console's renderer). A slow answer from any of them failed a run with
 * nothing wrong in the code.
 *
 * Each one has a double: same URL, so the page's CSP treats it exactly as
 * the real thing, and a fixed answer in the shape the product parses. What
 * has no double is blocked (support/hermetic.ts) and reported, never fetched.
 *
 * Pure on purpose (no Playwright import): tests/unitaires/browser-doubles.test.ts
 * runs these answers through the product's own parsers.
 */

/** The token Cloudflare's test site keys hand out, the one its test secret accepts. */
const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

type DoubleKind =
  | "map-tile"
  | "turnstile-script"
  | "turnstile-frame"
  | "viacep"
  | "nominatim-search"
  | "nominatim-reverse"
  | "scalar-bundle"
  | "cors-preflight";

interface DoubleAnswer {
  status: number;
  contentType: string;
  body: string | Buffer;
  headers?: Record<string, string>;
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Whether a request stays on this machine: the web, the API and anything
 * else on the loopback. Only http(s) is ever external; data:, blob: and the
 * like never leave the browser.
 */
function isLocalRequest(url: URL, localHosts: Iterable<string> = []): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;

  return LOOPBACK.has(url.hostname) || new Set(localHosts).has(url.hostname);
}

const OSM_TILE_HOST = /^(?:[a-c]\.)?tile\.openstreetmap\.org$/;

const TURNSTILE_HOST = "challenges.cloudflare.com";
const TURNSTILE_SCRIPT = "/turnstile/v0/api.js";

/** Where the double widget's frame lives (the real widget frames the same host). */
const TURNSTILE_FRAME_PREFIX = "/cdn-cgi/challenge-platform/turnstile-double/";

const VIACEP_PATH = /^\/ws\/(\d{8})\/json\/?$/;

/** The API console's renderer on jsDelivr (support/scalar-bundle.ts). */
const SCALAR_BUNDLE_PATH =
  /^\/npm\/@scalar\/api-reference@[\w.-]+\/dist\/browser\/standalone\.js$/;

/** Which double answers this request, or nothing when there is none. */
function classifyExternal(url: URL, method = "GET"): DoubleKind | null {
  const host = url.hostname;

  if (method === "OPTIONS") {
    return host === "viacep.com.br" || host === "nominatim.openstreetmap.org"
      ? "cors-preflight"
      : null;
  }

  if (OSM_TILE_HOST.test(host)) return "map-tile";

  if (host === TURNSTILE_HOST) {
    if (url.pathname === TURNSTILE_SCRIPT) return "turnstile-script";
    if (url.pathname.startsWith(TURNSTILE_FRAME_PREFIX))
      return "turnstile-frame";

    return null;
  }

  if (host === "viacep.com.br" && url.pathname.startsWith("/ws/"))
    return "viacep";

  if (host === "nominatim.openstreetmap.org") {
    if (url.pathname === "/search") return "nominatim-search";
    if (url.pathname === "/reverse") return "nominatim-reverse";
  }

  if (host === "cdn.jsdelivr.net" && SCALAR_BUNDLE_PATH.test(url.pathname))
    return "scalar-bundle";

  return null;
}

/**
 * One tile, 1×1 and solid (OpenStreetMap's water blue), stretched by Leaflet
 * to 256 px. A colour, not white: overlay-stacking compares what the menu
 * covers against the bare map, and a white tile under a white menu would
 * change almost nothing.
 */
const MAP_TILE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNYdfk+AASHAl0vf30xAAAAAElFTkSuQmCC",
  "base64",
);

/**
 * Cloudflare's api.js, reduced to what react-turnstile calls.
 *
 * `window.__tsScenario` picks what the widget does (default "pass"):
 *   pass        a token 200 ms after render
 *   error-once  an error, then tokens
 *   expire      a token, then expiry, then silence
 *   hang        never answers
 *   frame       draws an iframe of challenges.cloudflare.com and hands the
 *               token over only when that frame says it loaded — the real
 *               widget's flow, so the page's CSP (frame-src) is exercised
 * render, reset and remove calls are counted in `window.__ts`.
 */
const TURNSTILE_SCRIPT_BODY = `(() => {
  const TOKEN = ${JSON.stringify(TURNSTILE_DUMMY_TOKEN)};
  const FRAME = "https://${TURNSTILE_HOST}${TURNSTILE_FRAME_PREFIX}";
  const log = (window.__ts = window.__ts || { renders: 0, removes: 0, resets: 0, options: [] });
  const widgets = {};
  let next = 0;
  window.addEventListener("message", (event) => {
    const id = event.data && event.data.turnstileDouble;
    const widget = id && widgets[id];
    if (widget && widget.options.callback) widget.options.callback(TOKEN);
  });
  const run = (id) => {
    setTimeout(() => {
      const widget = widgets[id];
      if (!widget) return;
      const o = widget.options;
      const scenario = window.__tsScenario || "pass";
      if (scenario === "pass") o.callback && o.callback(TOKEN);
      if (scenario === "error-once") {
        window.__tsScenario = "pass";
        o["error-callback"] && o["error-callback"]("300030");
      }
      if (scenario === "expire") {
        o.callback && o.callback(TOKEN);
        // Expires once; the renewal then never answers.
        setTimeout(() => {
          window.__tsScenario = "hang";
          widgets[id] && o["expired-callback"] && o["expired-callback"]("x");
        }, 400);
      }
      if (scenario === "frame") {
        const frame = document.createElement("iframe");
        frame.setAttribute("title", "Widget de verificação (dublê)");
        frame.style.width = "100%";
        frame.style.height = "65px";
        frame.style.border = "0";
        frame.src = FRAME + id;
        widget.frame.appendChild(frame);
      }
    }, 200);
  };
  window.turnstile = {
    render(el, options) {
      const id = "stub-" + next++;
      log.renders += 1;
      log.options.push({
        theme: options.theme,
        language: options.language,
        size: options.size,
        refreshExpired: options["refresh-expired"],
        responseField: options["response-field"],
      });
      const frame = document.createElement("div");
      frame.setAttribute("data-stub-widget", id);
      frame.style.height = "65px";
      frame.style.background = "#9ca3af";
      el.appendChild(frame);
      widgets[id] = { frame, options };
      run(id);
      return id;
    },
    reset(id) { log.resets += 1; run(id); },
    remove(id) {
      log.removes += 1;
      const widget = widgets[id];
      if (widget) { widget.frame.remove(); delete widgets[id]; }
    },
    getResponse() { return undefined; },
    isExpired() { return false; },
    execute() {},
  };
  const onload = new URL(document.currentScript.src).searchParams.get("onload");
  if (onload && typeof window[onload] === "function") window[onload]();
})();`;

/** The double widget's frame: tells its page it loaded, as the real one posts its token. */
function turnstileFrameHtml(id: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Turnstile (dublê)</title></head><body style="margin:0;background:#9ca3af"><script>parent.postMessage({ turnstileDouble: ${JSON.stringify(id)} }, "*");</script></body></html>`;
}

/**
 * ViaCEP's answers for the CEPs the suites type (public data of that CEP).
 * Anything else is "not found", as ViaCEP answers an unknown CEP.
 */
const VIACEP: Record<string, Record<string, string>> = {
  "01001000": {
    cep: "01001-000",
    logradouro: "Praça da Sé",
    complemento: "lado ímpar",
    unidade: "",
    bairro: "Sé",
    localidade: "São Paulo",
    uf: "SP",
    estado: "São Paulo",
    regiao: "Sudeste",
    ibge: "3550308",
    gia: "1004",
    ddd: "11",
    siafi: "7107",
  },
};

/** One place for every search: Praça da Sé, in Nominatim's jsonv2 shape. */
const NOMINATIM_PLACE = {
  place_id: 1,
  licence: "Data © OpenStreetMap contributors, ODbL 1.0. (dublê de teste)",
  osm_type: "way",
  osm_id: 1,
  lat: "-23.5503898",
  lon: "-46.633081",
  display_name:
    "Praça da Sé, Sé, São Paulo, Região Imediata de São Paulo, São Paulo, Região Sudeste, 01001-000, Brasil",
  address: {
    road: "Praça da Sé",
    suburb: "Sé",
    city: "São Paulo",
    state: "São Paulo",
    region: "Região Sudeste",
    postcode: "01001-000",
    country: "Brasil",
    country_code: "br",
  },
  boundingbox: ["-23.5508898", "-23.5498898", "-46.633581", "-46.632581"] as [
    string,
    string,
    string,
    string,
  ],
};

const CORS = { "access-control-allow-origin": "*" };

function json(payload: unknown, status = 200): DoubleAnswer {
  return {
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(payload),
    headers: CORS,
  };
}

/**
 * The double's answer for a request `classifyExternal` recognised.
 *
 * The console renderer is a file, not a fixture: the caller hands it in
 * (support/scalar-bundle.ts reads and checks it), and without it there is no
 * answer.
 */
function answerFor(
  kind: DoubleKind,
  url: URL,
  files: { scalarBundle?: Buffer | null } = {},
): DoubleAnswer | null {
  switch (kind) {
    case "scalar-bundle":
      // Loaded with `integrity` and `crossorigin`: the CORS header is what
      // lets the browser check the hash.
      return files.scalarBundle
        ? {
            status: 200,
            contentType: "application/javascript; charset=utf-8",
            body: files.scalarBundle,
            headers: CORS,
          }
        : null;

    case "map-tile":
      return {
        status: 200,
        contentType: "image/png",
        body: MAP_TILE_PNG,
        headers: CORS,
      };

    case "turnstile-script":
      return {
        status: 200,
        contentType: "text/javascript; charset=utf-8",
        body: TURNSTILE_SCRIPT_BODY,
        headers: CORS,
      };

    case "turnstile-frame":
      return {
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: turnstileFrameHtml(
          url.pathname.slice(TURNSTILE_FRAME_PREFIX.length),
        ),
      };

    case "viacep": {
      const cep = VIACEP_PATH.exec(url.pathname)?.[1];

      // ViaCEP answers 400 to a malformed CEP, and "erro" to an unknown one.
      if (!cep) {
        return {
          status: 400,
          contentType: "text/html; charset=utf-8",
          body: "<h1>Http 400</h1>",
          headers: CORS,
        };
      }

      return json(VIACEP[cep] ?? { erro: "true" });
    }

    case "nominatim-search":
      return json([NOMINATIM_PLACE]);

    case "nominatim-reverse":
      return json(NOMINATIM_PLACE);

    case "cors-preflight":
      return {
        status: 204,
        contentType: "text/plain",
        body: "",
        headers: {
          ...CORS,
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "*",
          "access-control-max-age": "600",
        },
      };
  }
}

export {
  MAP_TILE_PNG,
  TURNSTILE_DUMMY_TOKEN,
  TURNSTILE_FRAME_PREFIX,
  TURNSTILE_SCRIPT_BODY,
  VIACEP,
  answerFor,
  classifyExternal,
  isLocalRequest,
};
export type { DoubleAnswer, DoubleKind };
