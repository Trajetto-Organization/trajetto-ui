import { afterEach, describe, expect, it, vi } from "vitest";

import {
  reverseGeocode,
  searchAddresses,
} from "@/app/(protected)/_components/shared/custom/location-picker/geocoding";

import {
  MAP_TILE_PNG,
  TURNSTILE_DUMMY_TOKEN,
  TURNSTILE_FRAME_PREFIX,
  TURNSTILE_SCRIPT_BODY,
  answerFor,
  classifyExternal,
  isLocalRequest,
} from "../ui/support/external-doubles";

/**
 * The browser suites' doubles of the third parties the screens call.
 *
 * The suites gate the staging image, and they waited on OpenStreetMap's
 * tiles, Cloudflare's captcha script, ViaCEP and Nominatim over the internet:
 * a slow answer from any of them failed the gate with nothing wrong in the
 * code. They now get local answers (tests/ui/support/hermetic.ts). An answer
 * the product cannot read would make the screens fail in a new way, so each
 * one is run here through the product's own code.
 */

/** A fetch that only knows the doubles, as the suites' browser does. */
async function doublesFetch(input: string): Promise<Response> {
  const url = new URL(input);
  const kind = classifyExternal(url);

  const answer = kind ? answerFor(kind, url) : null;

  if (!answer) throw new TypeError(`sem dublê: ${input}`);

  const body =
    typeof answer.body === "string" ? answer.body : new Uint8Array(answer.body);

  return new Response(body, {
    status: answer.status,
    headers: { "content-type": answer.contentType, ...answer.headers },
  });
}

const noThrottle = async () => undefined;

describe("what counts as leaving the machine", () => {
  it("is any http(s) host that is not this machine or the stack's own", () => {
    expect(isLocalRequest(new URL("http://localhost:3100/dashboard"))).toBe(
      true,
    );
    expect(isLocalRequest(new URL("http://127.0.0.1:3334/health"))).toBe(true);
    expect(isLocalRequest(new URL("http://[::1]:3334/health"))).toBe(true);
    expect(
      isLocalRequest(new URL("http://api.local:3334/x"), ["api.local"]),
    ).toBe(true);
    expect(isLocalRequest(new URL("data:text/plain,oi"))).toBe(true);
    expect(isLocalRequest(new URL("blob:http://localhost:3100/1"))).toBe(true);

    expect(isLocalRequest(new URL("https://viacep.com.br/ws/x"))).toBe(false);
    expect(isLocalRequest(new URL("https://localhost.example.com/"))).toBe(
      false,
    );
  });
});

describe("which double answers", () => {
  it("knows the four services by their real URLs", () => {
    const cases: Array<[string, string | null]> = [
      ["https://a.tile.openstreetmap.org/12/1517/2323.png", "map-tile"],
      ["https://tile.openstreetmap.org/1/0/0.png", "map-tile"],
      [
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=x&render=explicit",
        "turnstile-script",
      ],
      [
        `https://challenges.cloudflare.com${TURNSTILE_FRAME_PREFIX}stub-0`,
        "turnstile-frame",
      ],
      ["https://viacep.com.br/ws/01001000/json/", "viacep"],
      ["https://nominatim.openstreetmap.org/search?q=x", "nominatim-search"],
      [
        "https://nominatim.openstreetmap.org/reverse?lat=1",
        "nominatim-reverse",
      ],
    ];

    for (const [url, kind] of cases) {
      expect(classifyExternal(new URL(url)), url).toBe(kind);
    }
  });

  it("has none for anything else, which the suites then block", () => {
    for (const url of [
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      "https://static.cloudflareinsights.com/beacon.min.js",
      "https://www.openstreetmap.org/copyright",
      "https://example.com/",
      "https://evil.tile.openstreetmap.org.example.com/1/0/0.png",
    ]) {
      expect(classifyExternal(new URL(url)), url).toBeNull();
    }
  });

  it("answers the CORS preflight of the two cross-origin fetches", () => {
    const preflight = classifyExternal(
      new URL("https://nominatim.openstreetmap.org/search?q=x"),
      "OPTIONS",
    );

    expect(preflight).toBe("cors-preflight");
    expect(
      answerFor(preflight!, new URL("https://nominatim.openstreetmap.org/"))
        ?.headers,
    ).toMatchObject({ "access-control-allow-origin": "*" });
  });

  it("serves the API console's renderer only from the checked file it is handed", () => {
    const url = new URL(
      "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.72.1/dist/browser/standalone.js",
    );

    expect(classifyExternal(url)).toBe("scalar-bundle");
    expect(
      classifyExternal(
        new URL("https://cdn.jsdelivr.net/npm/qualquer-coisa@1/x.js"),
      ),
    ).toBeNull();

    // Not fetched (or not matching the API's hash): no answer, so blocked.
    expect(answerFor("scalar-bundle", url)).toBeNull();

    const answer = answerFor("scalar-bundle", url, {
      scalarBundle: Buffer.from("/* bundle */"),
    });

    expect(answer?.status).toBe(200);
    // Loaded with integrity + crossorigin: without CORS the hash is not checked.
    expect(answer?.headers).toMatchObject({
      "access-control-allow-origin": "*",
    });
  });
});

describe("the answers, read by the product", () => {
  it("a CEP resolves through ViaCEP and Nominatim to Praça da Sé", async () => {
    const found = await searchAddresses("01001-000", {
      fetcher: doublesFetch,
      throttle: noThrottle,
    });

    expect(found).toHaveLength(1);
    expect(found[0].address.road).toBe("Praça da Sé");
    expect(found[0].address.city).toBe("São Paulo");
    expect(Number(found[0].lat)).toBeCloseTo(-23.55, 1);
  });

  it("an unknown CEP is ViaCEP's 'not found', not an error", async () => {
    expect(
      await searchAddresses("99999-999", {
        fetcher: doublesFetch,
        throttle: noThrottle,
      }),
    ).toEqual([]);
  });

  it("the address form's CEP lookup reads city, state and street", async () => {
    // The fields useCepValidation copies from ViaCEP (_components/hooks).
    const answer = await (
      await doublesFetch("https://viacep.com.br/ws/01001000/json/")
    ).json();

    expect(answer.erro).toBeUndefined();
    expect(answer).toMatchObject({
      localidade: "São Paulo",
      uf: "SP",
      logradouro: "Praça da Sé",
    });
    expect(
      (await doublesFetch("https://viacep.com.br/ws/123/json/")).status,
    ).toBe(400);
  });

  it("a free-text search and a reverse lookup come back Brazilian", async () => {
    const found = await searchAddresses("Praça da Sé", {
      fetcher: doublesFetch,
      throttle: noThrottle,
    });

    expect(found[0].address.country_code).toBe("br");

    const place = await reverseGeocode(-23.55, -46.63, {
      fetcher: doublesFetch,
      throttle: noThrottle,
    });

    expect(place.display_name).toContain("São Paulo");
  });

  it("the tile is a real PNG, so Leaflet marks it loaded", () => {
    expect([...MAP_TILE_PNG.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    // IHDR: 1×1.
    expect(MAP_TILE_PNG.readUInt32BE(16)).toBe(1);
    expect(MAP_TILE_PNG.readUInt32BE(20)).toBe(1);
  });
});

describe("the captcha script double", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
    delete (window as unknown as { turnstile?: unknown }).turnstile;
    delete (window as unknown as { __tsScenario?: unknown }).__tsScenario;
    delete (window as unknown as { __ts?: unknown }).__ts;
  });

  /** Runs the script as the page would: from its <script>, `onload` named in the URL. */
  function load(): { onload: ReturnType<typeof vi.fn> } {
    const onload = vi.fn();

    (window as unknown as Record<string, unknown>).__turnstileOnload = onload;
    Object.defineProperty(document, "currentScript", {
      configurable: true,
      value: {
        src: "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__turnstileOnload&render=explicit",
      },
    });

    try {
      new Function(TURNSTILE_SCRIPT_BODY)();
    } finally {
      Object.defineProperty(document, "currentScript", {
        configurable: true,
        value: null,
      });
    }

    return { onload };
  }

  type Turnstile = {
    render: (el: HTMLElement, options: Record<string, unknown>) => string;
    remove: (id: string) => void;
  };

  const turnstile = () =>
    (window as unknown as { turnstile: Turnstile }).turnstile;

  it("calls the page's onload and hands out the token Cloudflare's test secret accepts", async () => {
    vi.useFakeTimers();

    const { onload } = load();

    expect(onload).toHaveBeenCalledTimes(1);

    const callback = vi.fn();
    const box = document.createElement("div");

    document.body.appendChild(box);
    turnstile().render(box, { callback, theme: "light" });

    await vi.advanceTimersByTimeAsync(250);

    expect(callback).toHaveBeenCalledWith(TURNSTILE_DUMMY_TOKEN);
    expect(box.querySelector("[data-stub-widget]")).not.toBeNull();
  });

  it("in the frame scenario, waits for Cloudflare's frame to speak before the token", async () => {
    vi.useFakeTimers();
    load();
    (window as unknown as { __tsScenario: string }).__tsScenario = "frame";

    const callback = vi.fn();
    // Left out of the document: happy-dom would load the frame's URL over
    // the network, and this file asks nothing of the internet either.
    const box = document.createElement("div");

    const id = turnstile().render(box, { callback });

    await vi.advanceTimersByTimeAsync(250);

    const frame = box.querySelector("iframe");

    expect(frame?.getAttribute("src")).toBe(
      `https://challenges.cloudflare.com${TURNSTILE_FRAME_PREFIX}${id}`,
    );
    expect(callback).not.toHaveBeenCalled();

    // What the frame's document posts (answerFor "turnstile-frame").
    window.dispatchEvent(
      new MessageEvent("message", { data: { turnstileDouble: id } }),
    );

    expect(callback).toHaveBeenCalledWith(TURNSTILE_DUMMY_TOKEN);
  });

  it("serves a frame document that posts its widget id to the page", () => {
    const html = String(
      answerFor(
        "turnstile-frame",
        new URL(
          `https://challenges.cloudflare.com${TURNSTILE_FRAME_PREFIX}stub-7`,
        ),
      )?.body,
    );

    expect(html).toContain('parent.postMessage({ turnstileDouble: "stub-7" }');
  });
});
