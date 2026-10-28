"use client";

import { createContext, useContext } from "react";

/**
 * What the rest of the protected area may ask of the ⌘K palette.
 *
 * The header button and the empty overview used kbar's `useKBar` for this,
 * which tied kbar (CommonJS: its search and virtual list came along) to the
 * first load of every protected page. They ask through this context instead,
 * and the palette itself is imported later (see ./index.tsx).
 */
interface CommandPaletteControls {
  /** Opens the palette, or closes it when it is open — what ⌘K does. */
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteControls>({
  // Outside the protected shell there is no palette to open.
  toggle: () => undefined,
});

function useCommandPalette(): CommandPaletteControls {
  return useContext(CommandPaletteContext);
}

const MAC_PLATFORM = /Mac|iPod|iPhone|iPad/;

/**
 * kbar's `$mod+k`, read the way its key matcher (tinykeys) reads it: ⌘ on an
 * Apple platform and Ctrl everywhere else, K by key or by physical key, and
 * no other modifier held (Ctrl+Shift+K and AltGr+K are other shortcuts).
 */
function isPaletteShortcut(event: KeyboardEvent): boolean {
  const key = typeof event.key === "string" ? event.key.toLowerCase() : "";

  if (key !== "k" && event.code !== "KeyK") return false;

  const apple =
    typeof navigator === "object" && MAC_PLATFORM.test(navigator.platform);

  const mod = apple ? event.metaKey : event.ctrlKey;
  const other = apple ? event.ctrlKey : event.metaKey;

  return mod && !other && !event.shiftKey && !event.altKey;
}

export { CommandPaletteContext, isPaletteShortcut, useCommandPalette };
export type { CommandPaletteControls };
