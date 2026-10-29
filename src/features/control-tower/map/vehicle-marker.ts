import { escapeHtml } from "@/lib/escape-html";

import type { VehicleStatus } from "../lib/vehicle-motion";

/**
 * The truck Leaflet draws for one vehicle, and the badge for a cluster.
 *
 * A top-down silhouette (cab ahead, cargo box behind) that turns with the
 * heading, coloured by status, with a soft pulse while the phone is live. The
 * plate shows on hover, on keyboard focus, when selected, or for every truck
 * once the map is zoomed to street level (the layer toggles a class on the
 * map container).
 *
 * Leaflet writes a divIcon's `html` with innerHTML, so the plate — tenant data
 * — is escaped here; nothing from the data reaches an attribute except the
 * status and booleans, which are constants. The element is built once per
 * truck and then mutated (status, selection, rotation), never rebuilt: a
 * rebuilt icon restarts the pulse and drops keyboard focus.
 */

/** The pixel box of a truck marker; the anchor is its centre. */
const VEHICLE_ICON_SIZE = 52;

/** The pixel box of a cluster badge. */
const CLUSTER_ICON_SIZE = 40;

/** At this zoom and closer, every truck shows its plate. */
const LABEL_ZOOM = 15;

/** The class the layer puts on the map container at street zoom. */
const LABELS_CLASS = "trj-vh-labels";

/** The divIcon classes: replace Leaflet's boxed default and scope the focus style. */
const VEHICLE_ICON_CLASS = "trj-vh-icon";
const CLUSTER_ICON_CLASS = "trj-vc-icon";

/** Legend order, too: from what needs the least attention to the most done. */
const STATUS_ORDER: readonly VehicleStatus[] = [
  "moving",
  "stopped",
  "paused",
  "silent",
  "ended",
];

const STATUS_LABEL: Record<VehicleStatus, string> = {
  moving: "Em rota",
  stopped: "Parado",
  paused: "Em pausa",
  silent: "Sem sinal",
  ended: "Rota concluída",
};

/**
 * Fill and cab shade per status, the same in both themes: the white outline
 * separates them from a dark map. Cluster badges sit on the shade, which holds
 * white text at 4.5:1 or better (amber's fill would not). The legend reads
 * these too, so the two never drift.
 */
const STATUS_COLOR: Record<VehicleStatus, { fill: string; shade: string }> = {
  moving: { fill: "#2563eb", shade: "#1d4ed8" },
  stopped: { fill: "#d97706", shade: "#b45309" },
  paused: { fill: "#7c3aed", shade: "#6d28d9" },
  silent: { fill: "#71717a", shade: "#52525b" },
  ended: { fill: "#15803d", shade: "#166534" },
};

/** Whether the phone is reporting: the only statuses that pulse. */
function isLive(status: VehicleStatus): boolean {
  return status === "moving" || status === "stopped" || status === "paused";
}

/**
 * Top-down truck, pointing north at 0°: cab with windshield and mirrors,
 * cargo box with two roof ribs. Fill and outline come from CSS variables so
 * one SVG serves every status and both themes.
 */
const TRUCK_SVG = `
<svg class="trj-vh__truck" viewBox="0 0 32 48" width="28" height="42" aria-hidden="true" focusable="false">
  <rect x="4.5" y="9" width="3" height="4" rx="1" class="trj-vh__mirror"/>
  <rect x="24.5" y="9" width="3" height="4" rx="1" class="trj-vh__mirror"/>
  <rect x="7" y="17" width="18" height="28" rx="3" class="trj-vh__body"/>
  <path d="M8 17 V9 Q8 3 14 3 H18 Q24 3 24 9 V17 Z" class="trj-vh__cab"/>
  <rect x="10" y="6" width="12" height="4.5" rx="1.6" class="trj-vh__glass"/>
  <line x1="10" y1="25" x2="22" y2="25" class="trj-vh__rib"/>
  <line x1="10" y1="35" x2="22" y2="35" class="trj-vh__rib"/>
</svg>`;

interface VehicleMarkerHtmlProps {
  /** A plate or a driver's name. */
  label: string;
  status: VehicleStatus;
  selected: boolean;
}

function vehicleMarkerHtml({
  label,
  status,
  selected,
}: VehicleMarkerHtmlProps): string {
  return `<div class="trj-vh" data-status="${status}" data-live="${isLive(status)}" data-selected="${selected}">
  <span class="trj-vh__pulse" aria-hidden="true"></span>
  <span class="trj-vh__halo" aria-hidden="true"></span>
  <div class="trj-vh__rotor">${TRUCK_SVG}</div>
  <span class="trj-vh__label">${escapeHtml(label)}</span>
</div>`;
}

/**
 * What a screen reader and the native tooltip say about one truck. Set as the
 * aria-label: without it a role=button takes its name from the plate span, and
 * the status would reach the user through colour alone.
 */
function vehicleTitle(label: string, status: VehicleStatus): string {
  return `${label} — ${STATUS_LABEL[status]}`;
}

/**
 * A word where colour alone would be ambiguous: a yard of finished routes
 * says "concluídas", so it is never read as phones without signal (TWR-8).
 */
function clusterMarkerHtml(count: number, status: VehicleStatus): string {
  const text = status === "ended" ? `${count} · concluídas` : String(count);

  return `<div class="trj-vc" data-status="${status}" data-live="${isLive(status)}">${text}</div>`;
}

function clusterTitle(count: number): string {
  return `${count} veículos — clique para aproximar`;
}

/** Names a marker for assistive tech and the native tooltip, idempotently. */
function setMarkerName(
  icon: HTMLElement | undefined | null,
  name: string,
): void {
  if (!icon) return;

  if (icon.title !== name) icon.title = name;
  if (icon.getAttribute("aria-label") !== name)
    icon.setAttribute("aria-label", name);
}

/** Mutates a truck already on the map: no rebuild, so no flicker. */
function syncVehicleElement(
  icon: HTMLElement | undefined | null,
  { label, status, selected }: VehicleMarkerHtmlProps,
): void {
  const root = icon?.querySelector<HTMLElement>(".trj-vh");

  if (!icon || !root) return;

  if (root.dataset.status !== status) {
    root.dataset.status = status;
    root.dataset.live = String(isLive(status));
  }

  if (root.dataset.selected !== String(selected))
    root.dataset.selected = String(selected);

  const text = root.querySelector<HTMLElement>(".trj-vh__label");

  // textContent, never innerHTML: the plate is tenant data.
  if (text && text.textContent !== label) text.textContent = label;

  setMarkerName(icon, vehicleTitle(label, status));
}

function setVehicleRotation(
  icon: HTMLElement | undefined | null,
  angle: number,
): void {
  const rotor = icon?.querySelector<HTMLElement>(".trj-vh__rotor");

  if (rotor) rotor.style.transform = `rotate(${angle.toFixed(1)}deg)`;
}

const STYLE_ID = "trj-vehicle-marker-styles";

/**
 * The marker's stylesheet, injected once. Kept next to the markup it styles
 * instead of in globals.css: the HTML is a string handed to Leaflet, and the
 * two must change together. The CSP allows inline styles ('unsafe-inline').
 */
const STYLES = `
.trj-vh, .trj-vc {
  --vh-color: #2563eb;
  --vh-color-dark: #1e40af;
  --vh-outline: #ffffff;
}
${STATUS_ORDER.map(
  (status) =>
    `.trj-vh[data-status="${status}"], .trj-vc[data-status="${status}"] { --vh-color: ${STATUS_COLOR[status].fill}; --vh-color-dark: ${STATUS_COLOR[status].shade}; }`,
).join(" ")}
.dark .trj-vh, .dark .trj-vc { --vh-outline: #f4f4f5; }

.trj-vh {
  position: relative;
  width: ${VEHICLE_ICON_SIZE}px;
  height: ${VEHICLE_ICON_SIZE}px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.trj-vh__rotor {
  position: relative;
  z-index: 2;
  display: flex;
  will-change: transform;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, .45)) drop-shadow(0 2px 6px rgba(0, 0, 0, .2));
}
.trj-vh__body { fill: var(--vh-color); stroke: var(--vh-outline); stroke-width: 2; }
.trj-vh__cab { fill: var(--vh-color-dark); stroke: var(--vh-outline); stroke-width: 2; stroke-linejoin: round; }
.trj-vh__glass { fill: rgba(255, 255, 255, .88); }
.trj-vh__mirror { fill: var(--vh-color-dark); stroke: var(--vh-outline); stroke-width: 1.2; }
.trj-vh__rib { stroke: rgba(255, 255, 255, .45); stroke-width: 1.4; stroke-linecap: round; }

.trj-vh__pulse, .trj-vh__halo {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  pointer-events: none;
}
.trj-vh__pulse {
  z-index: 1;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  background: var(--vh-color);
  opacity: 0;
}
.trj-vh[data-live="true"] .trj-vh__pulse { animation: trj-vh-pulse 2.4s ease-out infinite; }
@keyframes trj-vh-pulse {
  0% { transform: scale(.55); opacity: .35; }
  70% { transform: scale(1.35); opacity: 0; }
  100% { transform: scale(1.35); opacity: 0; }
}
.trj-vh__halo {
  z-index: 1;
  width: 50px;
  height: 50px;
  margin: -25px 0 0 -25px;
  border: 2.5px solid var(--vh-color);
  background: color-mix(in srgb, var(--vh-color) 14%, transparent);
  box-shadow: 0 0 0 2px var(--vh-outline);
  opacity: 0;
  transform: scale(.8);
  transition: opacity .15s ease, transform .15s ease;
}
.trj-vh[data-selected="true"] .trj-vh__halo { opacity: 1; transform: scale(1); }

.trj-vh__label {
  position: absolute;
  z-index: 3;
  top: calc(100% - 4px);
  left: 50%;
  transform: translate(-50%, -2px);
  padding: 2px 6px;
  border-radius: 6px;
  font: 600 11px/1.3 var(--font-mono, ui-monospace), ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .02em;
  white-space: nowrap;
  color: #18181b;
  background: rgba(255, 255, 255, .96);
  border: 1px solid rgba(24, 24, 27, .12);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .18);
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s ease, transform .15s ease;
}
.dark .trj-vh__label {
  color: #fafafa;
  background: rgba(24, 24, 27, .94);
  border-color: rgba(250, 250, 250, .14);
}
.leaflet-marker-icon:hover .trj-vh__label,
.leaflet-marker-icon:focus-visible .trj-vh__label,
.trj-vh[data-selected="true"] .trj-vh__label,
.${LABELS_CLASS} .trj-vh__label { opacity: 1; transform: translate(-50%, 0); }

.${VEHICLE_ICON_CLASS}:focus, .${CLUSTER_ICON_CLASS}:focus { outline: none; }
.${VEHICLE_ICON_CLASS}:focus-visible .trj-vh__rotor,
.${CLUSTER_ICON_CLASS}:focus-visible .trj-vc {
  outline: 2px solid var(--vh-color);
  outline-offset: 3px;
  border-radius: 8px;
}

.trj-vc {
  width: ${CLUSTER_ICON_SIZE}px;
  height: ${CLUSTER_ICON_SIZE}px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  cursor: pointer;
  font: 700 13px/1 var(--font-inter, system-ui), system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  color: #fff;
  background: var(--vh-color-dark);
  border: 2.5px solid var(--vh-outline);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--vh-color) 22%, transparent), 0 2px 8px rgba(0, 0, 0, .3);
}

.trj-vc[data-status="ended"] {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: auto;
  height: 30px;
  padding: 0 12px;
  white-space: nowrap;
  font-size: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .trj-vh[data-live="true"] .trj-vh__pulse { animation: none; opacity: .18; transform: scale(1); }
  .trj-vh__halo, .trj-vh__label { transition: none; }
}
`;

function ensureVehicleMarkerStyles(
  doc: Document | undefined = globalThis.document,
): void {
  if (!doc || doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");

  style.id = STYLE_ID;
  style.textContent = STYLES;
  doc.head.appendChild(style);
}

export {
  CLUSTER_ICON_CLASS,
  CLUSTER_ICON_SIZE,
  LABELS_CLASS,
  LABEL_ZOOM,
  STATUS_COLOR,
  STATUS_LABEL,
  STATUS_ORDER,
  VEHICLE_ICON_CLASS,
  VEHICLE_ICON_SIZE,
  clusterMarkerHtml,
  clusterTitle,
  ensureVehicleMarkerStyles,
  isLive,
  setMarkerName,
  setVehicleRotation,
  syncVehicleElement,
  vehicleMarkerHtml,
  vehicleTitle,
};
