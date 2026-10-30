import type * as Leaflet from "leaflet";

import type { MapTileSource, MapTiles } from "./map-tiles";

/**
 * The base map of every Leaflet map in the app (tower, route page, location
 * picker), following the theme while the page is open.
 *
 * With a dark style configured (MAP_TILE_URL_DARK) the layer is swapped for
 * it whenever <html> turns `.dark`, and back. The container then carries
 * NATIVE_DARK_CLASS, which switches off the CSS filter that otherwise
 * recolors the light tiles (leaflet-theme.css, "Maps in the dark theme").
 * Markers, trails and popups live in other panes and are never touched.
 */

/** On the map container while the tiles are the provider's dark style. */
const NATIVE_DARK_CLASS = "map-tiles-native-dark";

const TILE_OPTIONS = { maxZoom: 19 } as const;

function isDarkTheme(root: HTMLElement): boolean {
  return root.classList.contains("dark");
}

/** Which tiles to draw for a theme; `native` when they are already dark. */
function tileSourceFor(
  tiles: MapTiles,
  dark: boolean,
): MapTileSource & { native: boolean } {
  if (dark && tiles.dark) return { ...tiles.dark, native: true };

  return { url: tiles.url, attribution: tiles.attribution, native: false };
}

/**
 * Adds the base layer to `map` and keeps it in step with the theme. Returns
 * the cleanup (call it before `map.remove()`).
 */
function addThemedTileLayer(
  L: typeof Leaflet,
  map: Leaflet.Map,
  tiles: MapTiles,
  root: HTMLElement = document.documentElement,
): () => void {
  const container = map.getContainer();
  let current = tileSourceFor(tiles, isDarkTheme(root));
  let layer = L.tileLayer(current.url, {
    ...TILE_OPTIONS,
    attribution: current.attribution,
  }).addTo(map);

  container.classList.toggle(NATIVE_DARK_CLASS, current.native);

  // Without a dark style the URL never changes: the filter does the work.
  if (!tiles.dark) {
    return () => container.classList.remove(NATIVE_DARK_CLASS);
  }

  const observer = new MutationObserver(() => {
    const next = tileSourceFor(tiles, isDarkTheme(root));

    if (next.url === current.url) return;

    // A new layer rather than setUrl: the attribution control follows the
    // layer that is on the map, and each provider requires its own credit.
    const previous = layer;

    layer = L.tileLayer(next.url, {
      ...TILE_OPTIONS,
      attribution: next.attribution,
    });
    layer.addTo(map);
    layer.bringToBack();
    map.removeLayer(previous);
    container.classList.toggle(NATIVE_DARK_CLASS, next.native);
    current = next;
  });

  observer.observe(root, { attributes: true, attributeFilter: ["class"] });

  // A map removed without the cleanup must not get layers added to it.
  const stop = () => {
    observer.disconnect();
    map.off("unload", stop);
    container.classList.remove(NATIVE_DARK_CLASS);
  };

  map.on("unload", stop);

  return stop;
}

export { NATIVE_DARK_CLASS, addThemedTileLayer, tileSourceFor };
