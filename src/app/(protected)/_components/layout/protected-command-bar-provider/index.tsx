"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";

import type { ProtectedCommandBarProps } from "./protected-command-bar-provider.types";
import type { CommandPaletteProps } from "./palette";

import {
  CommandPaletteContext,
  isPaletteShortcut,
  useCommandPalette,
} from "./command-palette-context";

/** Longest the palette waits for an idle main thread before loading. */
const IDLE_LOAD_TIMEOUT_MS = 2000;

let paletteRequest: Promise<ComponentType<CommandPaletteProps>> | null = null;

/** The palette's chunk (kbar with its search and list), one request per page load. */
const loadPalette = (): Promise<ComponentType<CommandPaletteProps>> => {
  paletteRequest ??= import("./palette")
    .then((module) => module.CommandPalette)
    .catch((error: unknown) => {
      // A failed fetch (a deploy, a dropped connection) is asked again on
      // the next ⌘K instead of breaking the page.
      paletteRequest = null;
      throw error;
    });

  return paletteRequest;
};

/**
 * The ⌘K palette's shell, in the first load of every protected page.
 *
 * kbar is CommonJS, so any import of it brought its fuzzy search and virtual
 * list (~18 kB gzipped) into every protected page. This shell holds only
 * what must work from the first paint — ⌘K/Ctrl+K and the buttons that open
 * the palette (`useCommandPalette`) — and imports the palette itself when the
 * browser is idle, or at once when someone asks for it first. An ask made
 * before the chunk arrives opens the palette as soon as it lands.
 *
 * Once the palette is mounted, kbar's own listeners take over: ⌘K, Escape,
 * the arrows and the two-key page shortcuts ("e n", "r t"...), which are
 * registered with the palette — that is, after the idle load.
 */
const ProtectedCommandBar = ({
  children,
  user,
}: ProtectedCommandBarProps): JSX.Element => {
  const [Palette, setPalette] =
    useState<ComponentType<CommandPaletteProps> | null>(null);

  // ⌘K or a button pressed before the palette was mounted.
  const [openPending, setOpenPending] = useState(false);

  // kbar's toggle once the palette is mounted; null until then.
  const kbarToggleRef = useRef<(() => void) | null>(null);

  const load = useCallback(() => {
    loadPalette()
      .then((component) => setPalette(() => component))
      .catch(() => undefined);
  }, []);

  const toggle = useCallback(() => {
    if (kbarToggleRef.current) {
      kbarToggleRef.current();
      return;
    }

    setOpenPending(true);
    load();
  }, [load]);

  // After hydration and the page's own work, when the main thread is idle.
  useEffect(() => {
    const idle = typeof window.requestIdleCallback === "function";
    const handle = idle
      ? window.requestIdleCallback(load, { timeout: IDLE_LOAD_TIMEOUT_MS })
      : window.setTimeout(load, 0);

    return () => {
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [load]);

  // ⌘K before the palette is mounted. Afterwards kbar answers it (and calls
  // preventDefault), so this one stands aside and never toggles twice.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (kbarToggleRef.current || event.defaultPrevented) return;
      if (!isPaletteShortcut(event)) return;

      event.preventDefault();
      setOpenPending(true);
      load();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [load]);

  const onReady = useCallback((kbarToggle: (() => void) | null) => {
    kbarToggleRef.current = kbarToggle;
  }, []);

  const onOpened = useCallback(() => setOpenPending(false), []);

  const controls = useMemo(() => ({ toggle }), [toggle]);

  return (
    <CommandPaletteContext.Provider value={controls}>
      {children}
      {Palette ? (
        <Palette
          user={user}
          openOnMount={openPending}
          onReady={onReady}
          onOpened={onOpened}
        />
      ) : null}
    </CommandPaletteContext.Provider>
  );
};

export { ProtectedCommandBar, useCommandPalette };
