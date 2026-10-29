import { OSM_TILES } from "@/features/control-tower/lib/map-tiles";
import {
  PUBLIC_CONFIG_ELEMENT_ID,
  serializePublicConfig,
  type PublicConfig,
} from "@/env/public-config";

/**
 * Puts the public configuration in the document the way the root layout
 * does (src/env/public-config-script.tsx), so client code under test reads
 * it through src/env/client.ts like it does in the browser.
 *
 * In <head>, which the tests that reset `document.body` leave alone.
 */
function seedPublicConfig(overrides: Partial<PublicConfig> = {}): PublicConfig {
  const apiUrl = overrides.apiUrl ?? "http://api.test";
  const config: PublicConfig = {
    apiUrl,
    siteUrl: null,
    turnstileSiteKey: null,
    appEnv: "development",
    mapTiles: OSM_TILES,
    ...overrides,
  };

  clearPublicConfig();

  const element = document.createElement("script");
  element.id = PUBLIC_CONFIG_ELEMENT_ID;
  element.type = "application/json";
  element.textContent = serializePublicConfig(config);
  document.head.appendChild(element);

  return config;
}

function clearPublicConfig(): void {
  document.getElementById(PUBLIC_CONFIG_ELEMENT_ID)?.remove();
}

export { clearPublicConfig, seedPublicConfig };
