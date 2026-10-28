"use client";

import { useEffect } from "react";
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  VisualState,
  useKBar,
  useMatches,
  useRegisterActions,
} from "kbar";

import type { ProtectedCommandBarProps } from "./protected-command-bar-provider.types";

import { useCommandBarActions } from "./hooks";
import { useAuthStore } from "@/store/auth-store";

/**
 * The ⌘K palette: kbar, its actions, its search and its list.
 *
 * Only ./index.tsx imports this module, and only with `import()` — when the
 * browser is idle after the page loads, or on the first ⌘K or button press,
 * whichever comes first. Nothing here may be imported statically from the
 * protected layout or a page (tests/unitaires/client-bundle-boundaries.test.ts).
 */
interface CommandPaletteProps extends Pick<ProtectedCommandBarProps, "user"> {
  /** ⌘K or a button asked for the palette before this chunk arrived. */
  openOnMount: boolean;
  /** Hands kbar's toggle to the shell (`null` when the palette goes away). */
  onReady: (toggle: (() => void) | null) => void;
  /** The early ask was honoured. */
  onOpened: () => void;
}

// Registers actions dynamically — re-registers when store permissions change
const CommandBarDynamicActions = ({
  user,
}: Pick<ProtectedCommandBarProps, "user">): null => {
  const { permissions: storePermissions, enabledModules: storeModules } =
    useAuthStore();

  // Modules come from the session (/user/me), seeded by the server render and
  // refreshed by the security check whenever the master flips one — no fetch
  // of its own, which also keeps this outside the QueryClientProvider.
  const enabledModules = storeModules ?? user.enabledModules ?? null;

  // Use store permissions (updated by Socket.IO) when available
  const dynamicUser = {
    ...user,
    permissions:
      storePermissions.length > 0 ? storePermissions : user.permissions,
  };

  const { actions } = useCommandBarActions({
    user: dynamicUser,
    enabledModules,
  });

  useRegisterActions(actions, [
    storePermissions,
    // A string key keeps the dependency stable across renders.
    (enabledModules ?? []).join(","),
  ]);

  return null;
};

/** Connects kbar's store to the shell that loaded it. */
const PaletteBridge = ({
  openOnMount,
  onReady,
  onOpened,
}: Omit<CommandPaletteProps, "user">): null => {
  const { query } = useKBar();

  useEffect(() => {
    onReady(query.toggle);

    return () => onReady(null);
  }, [query, onReady]);

  useEffect(() => {
    if (!openOnMount) return;

    // Open, not toggle: ⌘K pressed twice while the chunk was on its way still
    // means "open", and React's development double effects must not close it.
    query.setVisualState((state) =>
      state === VisualState.hidden || state === VisualState.animatingOut
        ? VisualState.animatingIn
        : state,
    );
    onOpened();
  }, [openOnMount, query, onOpened]);

  return null;
};

const CommandPalette = ({
  user,
  openOnMount,
  onReady,
  onOpened,
}: CommandPaletteProps): JSX.Element => {
  // Beside the page, not around it: nothing under the protected layout reads
  // kbar's context any more (the shell's context answers the buttons), so
  // mounting this late never remounts the page.
  return (
    <KBarProvider actions={[]}>
      <CommandBarDynamicActions user={user} />
      <PaletteBridge
        openOnMount={openOnMount}
        onReady={onReady}
        onOpened={onOpened}
      />
      <KBarPortal>
        <KBarPositioner
          className="bg-black/50
          backdrop-blur-sm z-[99999]"
          data-kbar-portal
        >
          {/* Theme tokens throughout: the panel was fixed white with
              near-white item names in the dark theme. `w-full max-w-*`
              because the positioner already keeps a 16px gutter and a
              fixed 35rem ran past a phone's edge. */}
          <KBarAnimator
            className="bg-popover text-popover-foreground border
            rounded-xl shadow-xl flex flex-col gap-4 w-full max-w-[35rem]
            overflow-hidden"
            data-kbar-animator
          >
            <KBarSearch
              className="w-full outline-none px-6 py-4 bg-transparent
              text-foreground placeholder:text-muted-foreground"
              defaultPlaceholder="Digite um comando ou pesquise..."
            />
            <SearchResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
    </KBarProvider>
  );
};

const SearchResults = (): JSX.Element => {
  const { results } = useMatches();

  return (
    <div data-kbar-results>
      <KBarResults
        maxHeight={407}
        items={results}
        onRender={({ item, active }) =>
          typeof item === "string" ? (
            <div
              className="text-sm uppercase px-4 pt-3
              pb-1 text-muted-foreground font-bold"
              data-kbar-section
            >
              {item}
            </div>
          ) : (
            <div
              className={`flex items-center px-4 py-3 cursor-pointer ${
                active ? "bg-accent text-accent-foreground" : "bg-transparent"
              }`}
              data-kbar-item
              data-active={active || undefined}
            >
              <div className="flex items-center gap-2">
                {item.icon && <span>{item.icon}</span>}
                <span>{item.name}</span>
              </div>

              <div className="flex gap-1 ml-auto">
                {item.shortcut &&
                  item.shortcut.map((shortcut, index) => (
                    <div
                      key={index}
                      className="text-muted-foreground uppercase
                      bg-muted border rounded-sm py-[2px] px-3
                      min-w-8 w-8 text-center font-mono"
                    >
                      {shortcut}
                    </div>
                  ))}
              </div>
            </div>
          )
        }
      />
    </div>
  );
};

export { CommandPalette };
export type { CommandPaletteProps };
