import { escapeHtml } from "@/lib/escape-html";

/**
 * The popup over the picked point, once its address is known.
 *
 * The address comes from OpenStreetMap's reverse geocoding — a map anyone can
 * edit — or from what somebody saved earlier, and Leaflet writes popup
 * content with innerHTML. It is escaped so a street named with markup is
 * shown, not run.
 */
export function locationPopupHtml(address: string): string {
  return `
      <div style="text-align: center; padding: 8px; min-width: 150px;">
        <strong style="color: #d81b60; display: block; margin-bottom: 5px; font-size: 15px;">Localização</strong>
        <span style="display: block; font-size: 13px; line-height: 1.4;">${escapeHtml(address)}</span>
        <span style="display: block; font-size: 12px; color: #666; margin-top: 4px;">Clique para alterar</span>
      </div>
    `;
}
