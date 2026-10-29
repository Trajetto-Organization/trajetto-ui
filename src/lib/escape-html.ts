/**
 * Text made safe to place inside an HTML string.
 *
 * React escapes on its own; this is for the few places that hand a string of
 * markup to something that writes it with innerHTML — Leaflet's divIcon and
 * popups. Whatever data goes into those strings goes through here, so a name
 * or an address is shown as text however it was written, and no longer relies
 * on a validation regex somewhere else to keep `<` out.
 *
 * The five characters cover element content and quoted attribute values,
 * which are the only contexts the callers use.
 */
const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (char) => ENTITIES[char]);
}
