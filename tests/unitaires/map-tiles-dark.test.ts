import L from "leaflet";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  parsePublicConfig,
  readPublicConfig,
  type PublicConfig,
} from "@/env/public-config";
import { publicConfigSchema } from "@/env/public-config-schema";
import {
  OSM_TILES,
  readMapTileSettings,
  resolveMapTiles,
} from "@/features/control-tower/lib/map-tiles";
import {
  NATIVE_DARK_CLASS,
  addThemedTileLayer,
  tileSourceFor,
} from "@/features/control-tower/lib/themed-tile-layer";

/**
 * Maps in the dark theme (decision 16.123): an optional dark style from
 * MAP_TILE_URL_DARK, swapped live with the theme; without it the light
 * tiles keep the CSS filter.
 */

const LIGHT =
  "https://{s}.tiles.example.test/light/{z}/{x}/{y}.png?key=tile-secret";
const DARK = "https://dark.example.test/{z}/{x}/{y}.png?key=dark-secret";

const PRODUCTION_ENV = {
  NODE_ENV: "production",
  APP_ENV: "production",
  PUBLIC_API_URL: "https://api.intrajetto.test",
  METADATA_BASE: "https://www.intrajetto.test/",
  TURNSTILE_SITE_KEY: "0x4AAAAAAA-site",
  MAP_TILE_URL: LIGHT,
  MAP_TILE_ATTRIBUTION: "© Exemplo",
};

function config(env: Record<string, string | undefined>): PublicConfig {
  const result = parsePublicConfig(env);

  if (!result.ok) throw new Error(result.issues.join("; "));

  return result.config;
}

describe("MAP_TILE_URL_DARK in the public configuration", () => {
  it("carries the dark style and its own credit, escaped", () => {
    const tiles = config({
      ...PRODUCTION_ENV,
      MAP_TILE_URL_DARK: DARK,
      MAP_TILE_ATTRIBUTION_DARK: "© Escuro <b>",
    }).mapTiles;

    expect(tiles).toEqual({
      url: LIGHT,
      attribution: "© Exemplo",
      dark: { url: DARK, attribution: "© Escuro &lt;b&gt;" },
    });
    // The zod schema the boot check holds agrees.
    expect(
      publicConfigSchema.safeParse(
        config({ ...PRODUCTION_ENV, MAP_TILE_URL_DARK: DARK }),
      ).success,
    ).toBe(true);
  });

  it("falls back to the light credit and says so", () => {
    const result = parsePublicConfig({
      ...PRODUCTION_ENV,
      MAP_TILE_URL_DARK: DARK,
    });

    expect(result.ok && result.config.mapTiles?.dark).toEqual({
      url: DARK,
      attribution: "© Exemplo",
    });
    expect(result.warnings).toContain(
      "MAP_TILE_ATTRIBUTION_DARK: não definida; o mapa escuro usa o crédito de MAP_TILE_ATTRIBUTION",
    );
  });

  it("refuses a broken dark template by name, without echoing its key", () => {
    const result = parsePublicConfig({
      ...PRODUCTION_ENV,
      MAP_TILE_URL_DARK:
        "http://dark.example.test/{z}/{x}/{y}.png?key=dark-secret",
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues).toEqual([
      "MAP_TILE_URL_DARK: modelo inválido (https com {z}, {x} e {y}; {s} opcional)",
    ]);
    expect(JSON.stringify(result)).not.toContain("dark-secret");
  });

  it("ignores the dark style when there is no base map, with a warning", () => {
    const { MAP_TILE_URL: _light, ...rest } = PRODUCTION_ENV;
    const result = parsePublicConfig({ ...rest, MAP_TILE_URL_DARK: DARK });

    expect(result.ok && result.config.mapTiles).toBeNull();
    expect(result.warnings).toContain(
      "MAP_TILE_URL_DARK: ignorada sem MAP_TILE_URL; o tema escuro precisa do mapa claro como base",
    );
  });

  it("leaves no dark key when unset, so the maps keep the filter", () => {
    expect(config(PRODUCTION_ENV).mapTiles).toEqual({
      url: LIGHT,
      attribution: "© Exemplo",
    });
    // Development's OSM fallback stays the same object (the CSP keys on it).
    expect(resolveMapTiles({ appEnv: "development" })).toBe(OSM_TILES);
    expect(resolveMapTiles({ appEnv: "development", darkUrl: DARK })).toEqual({
      ...OSM_TILES,
      dark: { url: DARK, attribution: OSM_TILES.attribution },
    });
  });

  it("is read from the server environment at request time", () => {
    vi.stubEnv("MAP_TILE_URL_DARK", DARK);
    vi.stubEnv("MAP_TILE_ATTRIBUTION_DARK", "© Escuro");

    try {
      expect(readMapTileSettings()).toMatchObject({
        darkUrl: DARK,
        darkAttribution: "© Escuro",
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("is read back by the browser like the zod schema reads it", () => {
    const base = config({ ...PRODUCTION_ENV, MAP_TILE_URL_DARK: DARK });

    for (const mapTiles of [
      base.mapTiles,
      { url: LIGHT, attribution: "x", dark: { url: DARK } },
      { url: LIGHT, attribution: "x", dark: null },
      {
        url: LIGHT,
        attribution: "x",
        dark: { url: DARK, attribution: "y", extra: 1 },
      },
    ]) {
      const value = { ...base, mapTiles };
      const parsed = publicConfigSchema.safeParse(value);

      expect(readPublicConfig(value)).toEqual(
        parsed.success ? parsed.data : null,
      );
    }
  });
});

describe("addThemedTileLayer", () => {
  let container: HTMLDivElement;
  let map: L.Map;
  const root = document.documentElement;

  const tileUrls = () => {
    const urls: string[] = [];

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer)
        urls.push((layer as unknown as { _url: string })._url);
    });

    return urls;
  };

  const attribution = () =>
    map.getContainer().querySelector(".leaflet-control-attribution")
      ?.textContent ?? "";

  beforeEach(() => {
    root.className = "light";
    container = document.createElement("div");
    document.body.appendChild(container);
    map = L.map(container, { center: [-23.55, -46.63], zoom: 12 });
  });

  afterEach(() => {
    map.remove();
    container.remove();
    root.className = "";
  });

  it("swaps to the dark style and back when the theme flips, credit included", async () => {
    const stop = addThemedTileLayer(L, map, {
      url: LIGHT,
      attribution: "© Claro",
      dark: { url: DARK, attribution: "© Escuro" },
    });

    expect(tileUrls()).toEqual([LIGHT]);
    expect(container.classList.contains(NATIVE_DARK_CLASS)).toBe(false);

    root.classList.replace("light", "dark");
    await Promise.resolve();

    expect(tileUrls()).toEqual([DARK]);
    expect(container.classList.contains(NATIVE_DARK_CLASS)).toBe(true);
    expect(attribution()).toContain("© Escuro");
    expect(attribution()).not.toContain("© Claro");

    root.classList.replace("dark", "light");
    await Promise.resolve();

    expect(tileUrls()).toEqual([LIGHT]);
    expect(container.classList.contains(NATIVE_DARK_CLASS)).toBe(false);

    stop();
    root.classList.replace("light", "dark");
    await Promise.resolve();
    expect(tileUrls()).toEqual([LIGHT]);
  });

  it("starts on the dark style when the page opens dark", () => {
    root.className = "dark";
    addThemedTileLayer(L, map, {
      url: LIGHT,
      attribution: "a",
      dark: { url: DARK, attribution: "b" },
    });

    expect(tileUrls()).toEqual([DARK]);
    expect(container.classList.contains(NATIVE_DARK_CLASS)).toBe(true);
  });

  it("keeps one light layer under the filter when no dark style is set", async () => {
    addThemedTileLayer(L, map, { url: LIGHT, attribution: "a" });

    root.classList.replace("light", "dark");
    await Promise.resolve();

    expect(tileUrls()).toEqual([LIGHT]);
    // No native class: the CSS filter applies.
    expect(container.classList.contains(NATIVE_DARK_CLASS)).toBe(false);
  });

  it("picks the source per theme", () => {
    const tiles = {
      url: LIGHT,
      attribution: "a",
      dark: { url: DARK, attribution: "b" },
    };

    expect(tileSourceFor(tiles, false)).toEqual({
      url: LIGHT,
      attribution: "a",
      native: false,
    });
    expect(tileSourceFor(tiles, true)).toEqual({
      url: DARK,
      attribution: "b",
      native: true,
    });
    expect(tileSourceFor({ url: LIGHT, attribution: "a" }, true).native).toBe(
      false,
    );
  });

  it("is what all three maps use for their base layer", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    for (const path of [
      "features/control-tower/map/index.tsx",
      "features/routes/detail-page/route-map.tsx",
      "app/(protected)/_components/shared/custom/location-picker/hooks/index.ts",
    ]) {
      const source = readFileSync(
        resolve(__dirname, "../../src", path),
        "utf8",
      );

      expect(source, path).toContain("addThemedTileLayer(L, ");
      expect(source, path).not.toMatch(/L\.tileLayer\(/);
    }
  });
});
