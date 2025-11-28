"use client";

import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useMatches,
} from "kbar";

import { useCommandBarActions } from "./hooks";
import { ProtectedCommandBarProps } from "../dto";

const ProtectedCommandBar = ({
  children,
  user,
}: ProtectedCommandBarProps): JSX.Element => {
  const { actions } = useCommandBarActions({ user });

  return (
    <KBarProvider actions={actions}>
      <KBarPortal>
        <KBarPositioner
          className="bg-black/50 
          backdrop-blur-sm z-[99999]"
          data-kbar-portal
        >
          <KBarAnimator
            className="bg-white rounded-xl shadow-xl
            flex flex-col gap-4 w-[35rem] overflow-hidden"
            data-kbar-animator
          >
            <KBarSearch
              className="w-full outline-none
              px-6 py-4 text-black bg-white"
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
              pb-1 text-neutral-500 font-bold"
            >
              {item}
            </div>
          ) : (
            <div
              className={`flex items-center px-4 py-3 cursor-pointer ${
                active ? "bg-[#eeeeee]" : "bg-transparent"
              }`}
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
                      className="text-gray-400 uppercase
                      bg-slate-100 rounded-sm py-[2px] px-3
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
