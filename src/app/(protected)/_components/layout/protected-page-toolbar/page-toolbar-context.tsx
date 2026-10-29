"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * What a button in a page's action row needs to know about the row.
 *
 * Decision 16.61 (08/10/2026) reverses 3.6: the action buttons are `h-9` on
 * /admin AND /dashboard, with or without the company selector beside them —
 * the size the overviews' "Atualizar" always had. `h-10` (the selector's
 * height) read bulky, the legacy `h-8` read tiny. The toolbar also enforces
 * `h-9` on every button of its action row (switches and checkboxes
 * excepted), so a button that has not adopted this cannot break the row.
 * `hasContext` stays in the state: it still tells a button it shares the
 * selector's line, it just no longer changes its height.
 */
interface PageToolbarState {
  /** Rendered inside ProtectedPageToolbar's action slot. */
  inToolbar: boolean;

  /** That toolbar has a context (the company selector) on the same line. */
  hasContext: boolean;
}

const PageToolbarContext = createContext<PageToolbarState>({
  inToolbar: false,
  hasContext: false,
});

const PageToolbarProvider = ({
  hasContext,
  children,
}: {
  hasContext: boolean;
  children: ReactNode;
}): JSX.Element => (
  <PageToolbarContext.Provider value={{ inToolbar: true, hasContext }}>
    {children}
  </PageToolbarContext.Provider>
);

function usePageToolbar(): PageToolbarState {
  return useContext(PageToolbarContext);
}

/** The height rule, on its own so it can be asked without a render. */
function pageActionHeightClass(_state: PageToolbarState): "h-9" {
  // One size everywhere (decision 16.61): /admin and /dashboard rows match.
  return "h-9";
}

/**
 * Classes for a button in a page's action row: the row's height, full width
 * (the PageActions wrapper decides where that width ends — the whole row on
 * a phone, the button's own content from `sm`).
 */
function usePageActionClassName(): string {
  return `${pageActionHeightClass(usePageToolbar())} w-full`;
}

export {
  PageToolbarProvider,
  pageActionHeightClass,
  usePageActionClassName,
  usePageToolbar,
};
export type { PageToolbarState };
