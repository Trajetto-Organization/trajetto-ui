"use client";

import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useMatches,
  useRegisterActions,
} from "kbar";
import type { ProtectedCommandBarProps } from "./protected-command-bar-provider.types";

import { useCommandBarActions } from "./hooks";
import { useAuthStore } from "@/store/auth-store";

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

const ProtectedCommandBar = ({
  children,
  user,
}: ProtectedCommandBarProps): JSX.Element => {
  return (
    <KBarProvider actions={[]}>
      <CommandBarDynamicActions user={user} />
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
      {children}
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

export { ProtectedCommandBar };
