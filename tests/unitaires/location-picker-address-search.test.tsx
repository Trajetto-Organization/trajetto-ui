import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * The location picker's address search ("Digite o endereço, bairro, cidade
 * ou CEP"), used by service orders, fines and fuel records.
 *
 * Measured against the public Nominatim on 08/10/2026 before the change:
 * no country filter ("Toledo" answered Toledo, Spain first; "Valença" a
 * French town), `dedupe=0` (the same street listed two or three times), a
 * CEP from Manaus resolved to a street in Belo Horizonte (OSM barely knows
 * CEPs), a search fired 300 ms after each pause, a fixed 400 px list that
 * did not follow its field, no error state, and "Nenhum endereço encontrado"
 * shown during the debounce, before the search had even started.
 *
 * Only `fetch` is replaced (the geocoders are third parties); the picker,
 * its hooks, react-query and Radix are the real ones.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

import LocationPicker from "@/app/(protected)/_components/shared/custom/location-picker";
import {
  GeocodingError,
  MIN_REQUEST_INTERVAL_MS,
  SEARCH_DEBOUNCE_MS,
  buildReverseUrl,
  buildSearchUrl,
  createRequestThrottle,
  dedupeResults,
  extractCep,
  isSearchableQuery,
  isWeakMatch,
  rankByCep,
  searchAddresses,
  type Fetcher,
} from "@/app/(protected)/_components/shared/custom/location-picker/geocoding";
import type { NominatimSearchResult } from "@/app/(protected)/_components/shared/custom/location-picker/location-picker.types";
import { clearPublicConfig, seedPublicConfig } from "./helpers/public-config";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

function place(
  id: number,
  displayName: string,
  address: Partial<NominatimSearchResult["address"]> = {},
  lat = "-24.72",
  lon = "-53.74",
): NominatimSearchResult {
  return {
    place_id: id,
    licence: "ODbL",
    osm_type: "node",
    osm_id: id,
    lat,
    lon,
    display_name: displayName,
    address: { country_code: "br", ...address },
    boundingbox: ["0", "0", "0", "0"],
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const noWait = async () => undefined;

describe("the geocoder's request", () => {
  it("restricts a free-text search to Brazil, in Portuguese, with a short list", () => {
    const url = new URL(buildSearchUrl("  Toledo   PR "));

    expect(url.origin + url.pathname).toBe(
      "https://nominatim.openstreetmap.org/search",
    );
    expect(url.searchParams.get("q")).toBe("Toledo PR");
    expect(url.searchParams.get("countrycodes")).toBe("br");
    expect(url.searchParams.get("accept-language")).toBe("pt-BR");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("addressdetails")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("8");
    // dedupe=0 listed the same street once per OSM segment.
    expect(url.searchParams.has("dedupe")).toBe(false);
  });

  it("searches what a CEP resolves to as a structured query, still Brazil-only", () => {
    const url = new URL(
      buildSearchUrl({
        street: "Rua Barão de São Domingos",
        city: "Manaus",
        state: "Amazonas",
      }),
    );

    expect(url.searchParams.get("street")).toBe("Rua Barão de São Domingos");
    expect(url.searchParams.get("city")).toBe("Manaus");
    expect(url.searchParams.get("state")).toBe("Amazonas");
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.get("countrycodes")).toBe("br");
  });

  it("asks the reverse geocoder in Portuguese", () => {
    const url = new URL(buildReverseUrl(-23.5, -46.6));

    expect(url.pathname).toBe("/reverse");
    expect(url.searchParams.get("lat")).toBe("-23.5");
    expect(url.searchParams.get("lon")).toBe("-46.6");
    expect(url.searchParams.get("accept-language")).toBe("pt-BR");
  });

  it.each([
    ["01310-100", "01310100"],
    ["01310100", "01310100"],
    [" 01.310-100 ", "01310100"],
    ["Rua 15 de Novembro", null],
    ["0131", null],
    ["01310-100 São Paulo", null],
  ])("reads %j as the CEP %j", (query, cep) => {
    expect(extractCep(query)).toBe(cep);
  });

  it("needs at least three characters, spaces not counted", () => {
    expect(isSearchableQuery("  ab  ")).toBe(false);
    expect(isSearchableQuery("abc")).toBe(true);
  });

  it("keeps Brazilian results only, each address once", () => {
    const toledoPr = place(1, "Toledo, Paraná, Região Sul, Brasil");
    const toledoPrBoundary = place(2, "Toledo, Paraná, Região Sul, Brasil");
    const toledoEs = place(3, "Toledo, Castela-Mancha, Espanha", {
      country_code: "es",
    });
    const toledoMg = place(4, "Toledo, Minas Gerais, Região Sudeste, Brasil");

    expect(
      dedupeResults([toledoPr, toledoPrBoundary, toledoEs, toledoMg]),
    ).toEqual([toledoPr, toledoMg]);
  });
});

describe("a weak match", () => {
  // Live answer of 08/10/2026 for the typo "Curitba".
  const boaVista = place(
    9,
    "Rua Foz do Iguaçu, Residencial Nova Esperança, Equatorial, Boa Vista, Roraima, Região Norte, 69317-320, Brasil",
  );

  it("is a first result that shares no name with what was typed", () => {
    expect(isWeakMatch("Curitba", [boaVista])).toBe(true);
  });

  it("is not a result that carries the typed name, accents and case aside", () => {
    expect(
      isWeakMatch("sao jose dos campos", [
        place(1, "São José dos Campos, São Paulo, Região Sudeste, Brasil"),
      ]),
    ).toBe(false);
    expect(
      isWeakMatch("Rua Treze de Maio, Bela Vista", [
        place(2, "Rua Treze de Maio, Bela Vista, São Paulo, Brasil"),
      ]),
    ).toBe(false);
  });

  it("ignores generic words, numbers, CEPs and empty lists", () => {
    // Only "rua" and a number: nothing to compare, so not called weak.
    expect(isWeakMatch("Rua 7", [boaVista])).toBe(false);
    expect(isWeakMatch("69020-030", [boaVista])).toBe(false);
    expect(isWeakMatch("Curitba", [])).toBe(false);
  });
});

describe("the one-request-per-second limit", () => {
  it("lets requests out at least the interval apart, on the real clock", async () => {
    // The production interval is MIN_REQUEST_INTERVAL_MS (1 s); 60 ms keeps
    // the same code path fast here.
    expect(MIN_REQUEST_INTERVAL_MS).toBe(1000);
    const throttle = createRequestThrottle(60);
    const sent: number[] = [];

    await Promise.all(
      [1, 2, 3].map(() => throttle().then(() => sent.push(Date.now()))),
    );

    const sorted = [...sent].sort((a, b) => a - b);
    expect(sorted[1] - sorted[0]).toBeGreaterThanOrEqual(55);
    expect(sorted[2] - sorted[1]).toBeGreaterThanOrEqual(55);

    // Long after the last one, a request goes straight out.
    await new Promise((done) => setTimeout(done, 80));
    const start = Date.now();
    await throttle();
    expect(Date.now() - start).toBeLessThan(20);
  });

  it("drops a request whose search was replaced while it waited, without holding a slot", async () => {
    let clock = 0;
    const controller = new AbortController();
    const throttle = createRequestThrottle(
      1000,
      () => clock,
      async (ms) => {
        clock += ms;
        controller.abort();
      },
    );

    await throttle();
    await expect(throttle(controller.signal)).rejects.toThrow(/Aborted/);

    // The aborted one never went out: the next waits from the last real send.
    clock = 1000;
    const before = clock;
    await throttle();
    expect(clock).toBe(before);
  });
});

describe("the search", () => {
  it("makes one Brazil-only request for free text", async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (url) => {
      calls.push(url);
      return json([place(1, "Toledo, Paraná, Região Sul, Brasil")]);
    };

    const results = await searchAddresses("Toledo", {
      fetcher,
      throttle: noWait,
    });

    expect(results).toHaveLength(1);
    expect(calls).toHaveLength(1);
    expect(new URL(calls[0]).searchParams.get("countrycodes")).toBe("br");
  });

  it("resolves a CEP through ViaCEP and searches its street, city and state", async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (url) => {
      calls.push(url);
      if (url.startsWith("https://viacep.com.br/")) {
        return json({
          logradouro: "Rua Barão de São Domingos",
          localidade: "Manaus",
          uf: "AM",
          estado: "Amazonas",
        });
      }
      return json([
        place(1, "Rua Barão de São Domingos, Centro, Manaus, Amazonas, Brasil"),
      ]);
    };

    const results = await searchAddresses("69005-010", {
      fetcher,
      throttle: noWait,
    });

    expect(calls[0]).toBe("https://viacep.com.br/ws/69005010/json/");
    const search = new URL(calls[1]).searchParams;
    expect([
      search.get("street"),
      search.get("city"),
      search.get("state"),
    ]).toEqual(["Rua Barão de São Domingos", "Manaus", "Amazonas"]);
    expect(results.map((result) => result.display_name)).toEqual([
      "Rua Barão de São Domingos, Centro, Manaus, Amazonas, Brasil",
    ]);
  });

  it("falls back to the town when OSM does not have the CEP's street", async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (url) => {
      calls.push(url);
      if (url.startsWith("https://viacep.com.br/")) {
        return json({
          logradouro: "Rua Nova",
          localidade: "Pomerode",
          estado: "Santa Catarina",
        });
      }
      return new URL(url).searchParams.has("street")
        ? json([])
        : json([place(9, "Pomerode, Santa Catarina, Região Sul, Brasil")]);
    };

    const results = await searchAddresses("89107000", {
      fetcher,
      throttle: noWait,
    });

    expect(calls).toHaveLength(3);
    expect(new URL(calls[2]).searchParams.has("street")).toBe(false);
    expect(results).toHaveLength(1);
  });

  it("lists first the segments of a long street closest to the CEP typed", () => {
    const far = place(1, "Avenida Paulista, 01414-000", {
      postcode: "01414-000",
    });
    const near = place(2, "Avenida Paulista, 01310-300", {
      postcode: "01310-300",
    });
    const exact = place(3, "Avenida Paulista, 01310-100", {
      postcode: "01310-100",
    });
    const none = place(4, "Avenida Paulista");

    expect(
      rankByCep([far, near, none, exact], "01310100").map(
        (result) => result.place_id,
      ),
    ).toEqual([3, 2, 1, 4]);
  });

  it("answers nothing for an unknown CEP, without asking Nominatim", async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (url) => {
      calls.push(url);
      return json({ erro: "true" });
    };

    expect(
      await searchAddresses("58400-000", { fetcher, throttle: noWait }),
    ).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("says when the geocoder is rate limiting, in Portuguese", async () => {
    const fetcher: Fetcher = async () => json({}, 429);

    const failure = await searchAddresses("Toledo", {
      fetcher,
      throttle: noWait,
    }).catch((error) => error);

    expect(failure).toBeInstanceOf(GeocodingError);
    expect(failure.status).toBe(429);
    expect(failure.message).toMatch(/Muitas buscas seguidas/);
  });

  it("turns a transport failure into a Portuguese error, never the browser's text", async () => {
    const fetcher: Fetcher = async () => {
      throw new TypeError("Failed to fetch");
    };

    const failure = await searchAddresses("Chapecó Centro", {
      fetcher,
      throttle: noWait,
    }).catch((error) => error);

    expect(failure).toBeInstanceOf(GeocodingError);
    expect(failure.message).toBe(
      "Não foi possível buscar o endereço agora. Verifique sua conexão e tente de novo.",
    );
    expect(failure.message).not.toContain("Failed to fetch");
  });

  it("does the same for a CEP whose ViaCEP request fails at the transport level", async () => {
    const fetcher: Fetcher = async () => {
      throw new TypeError("Failed to fetch");
    };

    const failure = await searchAddresses("01310-100", {
      fetcher,
      throttle: noWait,
    }).catch((error) => error);

    expect(failure).toBeInstanceOf(GeocodingError);
    expect(failure.message).toMatch(/Verifique sua conexão/);
  });

  it("keeps an aborted request an AbortError, so a replaced search stays silent", async () => {
    const fetcher: Fetcher = async () => {
      throw new DOMException("Aborted", "AbortError");
    };

    const failure = await searchAddresses("Toledo", {
      fetcher,
      throttle: noWait,
    }).catch((error) => error);

    expect(failure).not.toBeInstanceOf(GeocodingError);
    expect(failure.name).toBe("AbortError");
  });

  it("never calls the geocoder below three characters", async () => {
    const fetcher = vi.fn<Parameters<Fetcher>, ReturnType<Fetcher>>();

    expect(
      await searchAddresses(" ab ", { fetcher, throttle: noWait }),
    ).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("the picker's search field", () => {
  let root: Root | null = null;
  let host: HTMLElement | null = null;
  const fetchCalls: string[] = [];
  let answer: (url: string) => Response = () => json([]);
  const onLocationChange = vi.fn();

  beforeEach(() => {
    seedPublicConfig();
    fetchCalls.length = 0;
    onLocationChange.mockReset();
    answer = () => json([]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("nominatim") || url.includes("viacep")) {
          fetchCalls.push(url);
          return answer(url);
        }
        return json({});
      }),
    );
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    host?.remove();
    document.body.innerHTML = "";
    clearPublicConfig();
    vi.unstubAllGlobals();
    vi.stubGlobal("React", React);
  });

  async function mount(): Promise<void> {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root!.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(LocationPicker, {
            onLocationChange,
            latitude: null,
            longitude: null,
          }),
        ),
      );
    });
  }

  async function openSearch(): Promise<HTMLInputElement> {
    const trigger = document.querySelector<HTMLButtonElement>(
      '[role="combobox"][aria-label="Buscar Endereço"]',
    )!;

    await act(async () => {
      trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      trigger.click();
    });

    return document.querySelector<HTMLInputElement>(
      'input[placeholder^="Digite o endereço"]',
    )!;
  }

  async function type(input: HTMLInputElement, value: string): Promise<void> {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  const wait = (ms: number) =>
    act(async () => {
      await new Promise((done) => setTimeout(done, ms));
    });

  // The real one-per-second limit is shared by every search in the tab, so a
  // search right after the previous test's may wait for its slot.
  async function until(
    condition: () => boolean,
    timeout = 3000,
  ): Promise<void> {
    const deadline = Date.now() + timeout;
    while (!condition() && Date.now() < deadline) await wait(50);
  }

  const popover = () =>
    document.querySelector<HTMLElement>(
      '[data-testid="address-search-popover"]',
    );

  it("takes exactly the field's width, through Radix's trigger-width variable", async () => {
    await mount();
    await openSearch();

    const content = popover();
    expect(content, "the search list did not open").not.toBeNull();
    expect(content!.className).toContain(
      "w-[var(--radix-popover-trigger-width)]",
    );
    // The old list was a fixed 400 px, wider or narrower than its field.
    expect(content!.className).not.toMatch(/(^|\s)w-\[\d+px\]/);
    expect(content!.className).not.toMatch(/(^|\s)w-72(\s|$)/);
    // A min or max width would break the match with the field at some size.
    expect(content!.className).not.toMatch(/(^|\s)(min|max)-w-/);
    // Radix measures the trigger and keeps the variable current on resize.
    expect(
      content!.style.getPropertyValue("--radix-popover-trigger-width"),
    ).toBe("var(--radix-popper-anchor-width)");
  });

  it("searches once after a pause in typing, not on every keystroke", async () => {
    answer = () =>
      json([
        place(1, "Toledo, Paraná, Região Sul, Brasil", {
          town: "Toledo",
          state: "Paraná",
        }),
      ]);
    await mount();
    const input = await openSearch();

    await type(input, "Tol");
    await wait(100);
    await type(input, "Tole");
    await wait(100);
    await type(input, "Toledo");

    // Still typing: the list says it is searching, never "nada encontrado".
    expect(fetchCalls).toEqual([]);
    expect(document.body.textContent).toContain("Buscando endereços...");
    expect(document.body.textContent).not.toContain(
      "Nenhum endereço encontrado",
    );

    await wait(SEARCH_DEBOUNCE_MS + 150);
    await until(() => (document.body.textContent ?? "").includes("encontrado"));

    expect(fetchCalls).toHaveLength(1);
    const params = new URL(fetchCalls[0]).searchParams;
    expect(params.get("q")).toBe("Toledo");
    expect(params.get("countrycodes")).toBe("br");
    expect(document.body.textContent).toContain("1 endereço encontrado");
    expect(document.body.textContent).toContain("Toledo - Paraná");
  });

  it("keeps the picked place's own name instead of reverse geocoding its centre", async () => {
    answer = () =>
      json([
        place(
          1,
          "Toledo, Paraná, Região Sul, Brasil",
          { town: "Toledo", state: "Paraná" },
          "-24.7136",
          "-53.7405",
        ),
      ]);
    await mount();
    const input = await openSearch();

    await type(input, "Toledo");
    await until(() => document.querySelector("[cmdk-item]") !== null);

    const item = document.querySelector<HTMLElement>("[cmdk-item]")!;
    await act(async () => item.click());
    await wait(50);

    expect(onLocationChange).toHaveBeenCalledWith(-24.7136, -53.7405);
    // The reverse lookup named a random street of the town ("Rua Raimundo
    // Leonardi") and spent a second request of the shared quota.
    expect(fetchCalls.some((url) => url.includes("/reverse"))).toBe(false);
    const trigger = document.querySelector(
      '[role="combobox"][aria-label="Buscar Endereço"]',
    )!;
    expect(trigger.textContent).toContain("Toledo - Paraná");
  });

  const items = () =>
    Array.from(document.querySelectorAll<HTMLElement>("[cmdk-item]"));
  const highlighted = () =>
    items().filter((item) => item.getAttribute("aria-selected") === "true");

  it("highlights the first result of a real match, so Enter picks it", async () => {
    answer = () =>
      json([
        place(1, "Toledo, Minas Gerais, Região Sudeste, Brasil", {
          town: "Toledo",
          state: "Minas Gerais",
        }),
        place(2, "Toledo, Paraná, Região Sul, Brasil", {
          town: "Toledo",
          state: "Paraná",
        }),
      ]);
    await mount();
    const input = await openSearch();

    await type(input, "Toledo");
    await until(() => items().length === 2);
    await wait(50);

    expect(highlighted()).toEqual([items()[0]]);
    expect(
      document.querySelector('[data-testid="address-search-weak"]'),
    ).toBeNull();
  });

  it("highlights nothing for a weak match until the arrow keys move into the list", async () => {
    answer = () =>
      json([
        place(
          9,
          "Rua Foz do Iguaçu, Equatorial, Boa Vista, Roraima, Região Norte, Brasil",
          {
            road: "Rua Foz do Iguaçu",
            city: "Boa Vista",
            state: "Roraima",
          },
        ),
      ]);
    await mount();
    const input = await openSearch();

    await type(input, "Curitba");
    await until(() => items().length === 1);
    await wait(50);

    // Before the fix cmdk highlighted it and Enter picked Boa Vista, RR.
    expect(highlighted()).toEqual([]);
    expect(
      document.querySelector('[data-testid="address-search-weak"]')
        ?.textContent,
    ).toContain("aproximados");
    // Screen readers hear the hint: it sits in a polite live region.
    const region = document
      .querySelector('[data-testid="address-search-weak"]')!
      .closest('[role="status"]');
    expect(region?.getAttribute("aria-live")).toBe("polite");

    const press = (key: string) =>
      act(async () => {
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
      });

    await press("Enter");
    expect(onLocationChange).not.toHaveBeenCalled();

    await press("ArrowDown");
    expect(highlighted()).toEqual([items()[0]]);

    await press("Enter");
    await wait(50);
    expect(onLocationChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the live region mounted before the hint appears, so its text is announced", async () => {
    await mount();
    await openSearch();

    const region = popover()!.querySelector(
      '[role="status"][aria-live="polite"]',
    );
    expect(region, "no live region while the list is empty").not.toBeNull();
    expect(region!.textContent).toBe("");
  });

  it("shows a Portuguese sentence when the browser cannot reach the geocoder", async () => {
    answer = () => {
      throw new TypeError("Failed to fetch");
    };
    await mount();
    const input = await openSearch();

    await type(input, "Chapecó Centro");
    await until(() => document.querySelector('[role="alert"]') !== null);

    const alert = document.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Busca indisponível");
    expect(alert?.textContent).toContain("Verifique sua conexão");
    expect(document.body.textContent).not.toContain("Failed to fetch");
  });

  it("shows the failure with a way to try again", async () => {
    answer = () => json({}, 503);
    await mount();
    const input = await openSearch();

    await type(input, "Petrópolis");
    await until(() => document.querySelector('[role="alert"]') !== null);

    const alert = document.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Busca indisponível");
    expect(alert?.textContent).toContain(
      "Não foi possível buscar o endereço agora",
    );
    expect(document.body.textContent).not.toContain(
      "Nenhum endereço encontrado",
    );

    answer = () =>
      json([
        place(5, "Petrópolis, Rio de Janeiro, Região Sudeste, Brasil", {
          city: "Petrópolis",
          state: "Rio de Janeiro",
        }),
      ]);
    const retry = Array.from(alert!.querySelectorAll("button")).find(
      (button) => button.textContent === "Tentar novamente",
    )!;
    await act(async () => retry.click());
    await until(() =>
      (document.body.textContent ?? "").includes("Petrópolis - Rio de Janeiro"),
    );

    expect(document.body.textContent).toContain("Petrópolis - Rio de Janeiro");
  });
});
