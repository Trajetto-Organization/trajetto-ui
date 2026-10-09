/**
 * The words Leaflet puts on a map by itself, in Portuguese, for the two maps
 * of the product (the control tower and the location picker).
 *
 * Leaflet names its zoom buttons "Zoom in" / "Zoom out" (title and
 * aria-label, read aloud and shown on hover) and credits itself with a link
 * titled "A JavaScript library for interactive maps". Neither is reachable
 * through `locale`: the zoom titles go on a control added by hand, and the
 * credit through `attributionControl.setPrefix`.
 *
 * No Leaflet import here: the tile settings that use the OSM credit are read
 * on the server, where Leaflet cannot load (it touches `window`).
 *
 * The credit links open in a new tab: the location picker sits inside a
 * form, and leaving in the same tab would drop what was typed.
 */

const ZOOM_CONTROL_TITLES = {
  zoomInTitle: "Aumentar zoom",
  zoomOutTitle: "Diminuir zoom",
} as const;

const LEAFLET_ATTRIBUTION_PREFIX =
  '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer" title="Biblioteca de mapas interativos">Leaflet</a>';

/** OpenStreetMap's required credit, as its attribution guidelines ask: linked to the copyright page. */
const OSM_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">colaboradores do OpenStreetMap</a>';

export { LEAFLET_ATTRIBUTION_PREFIX, OSM_ATTRIBUTION, ZOOM_CONTROL_TITLES };
