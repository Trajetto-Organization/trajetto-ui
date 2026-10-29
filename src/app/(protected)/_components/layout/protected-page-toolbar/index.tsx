import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PageToolbarProvider } from "./page-toolbar-context";

/**
 * The band between a page's title and its content: context, actions, sections.
 *
 * Entregas had these three in the wrong order and on three separate lines —
 * the company selector, then the section strip, then a row of buttons hanging
 * under it. Reading top to bottom that says: choose a company, choose a
 * section, and by the way here are four things you can do to something. The
 * buttons belonged to the section ABOVE them and looked like they belonged to
 * the table below.
 *
 * The order here is the one the work is done in:
 *
 *   contexto   — whose operation am I looking at
 *   ações      — what can I do to it
 *   navegação  — which part of it am I looking at
 *   conteúdo   — it
 *
 * Context and actions share the first line, which is what a person scans
 * left-to-right anyway: the subject on the left, the verbs on the right. They
 * separate on their own when they stop fitting — `flex-wrap` with the actions
 * pushed right by `ml-auto`, so the break happens at the width where it is
 * actually needed rather than at a breakpoint somebody guessed. On a phone
 * each takes its own line, because they are both full width there.
 */
interface ProtectedPageToolbarProps {
  /** What the screen is ABOUT. The company selector, where there is one. */
  context?: ReactNode;

  /** What can be DONE to it, in the section that is open. */
  actions?: ReactNode;

  /** The section strip, spanning the full width under both. */
  children?: ReactNode;

  className?: string;
}

const ProtectedPageToolbar = ({
  context,
  actions,
  children,
  className,
}: ProtectedPageToolbarProps): JSX.Element => {
  const hasTopRow = Boolean(context) || Boolean(actions);

  return (
    /*
      The three data attributes are the contract, not decoration. What this
      component promises is an ORDER — context and actions above the
      navigation — and an order is invisible to every assertion that can only
      find things by their text. `tests/responsive/deliveries-composition.spec.ts`
      reads these to check the geometry: that the actions sit above the strip
      and not under it, and that the two halves of the top row share a line
      while there is room for them to.
    */
    <div data-page-toolbar className={cn("space-y-3", className)}>
      {hasTopRow && (
        <div className="flex w-full flex-wrap items-center gap-3">
          {context && (
            <div data-toolbar-context className="w-full min-w-0 sm:w-auto">
              {context}
            </div>
          )}

          {/*
            `sm:ml-auto` and nothing else — no `flex-1`.

            With `flex-1` the actions would shrink into whatever the selector
            left over and wrap INSIDE their own box, which at 1024px meant two
            cramped rows of buttons beside a selector. Sized by their content
            instead, they either fit on the line or take the next one whole,
            and the width where that happens is the width where they genuinely
            stopped fitting.
          */}
          {actions && (
            <div
              data-toolbar-actions
              className={cn(
                "w-full min-w-0 sm:ml-auto sm:w-auto",

                /*
                  Every button of the row is `h-9` (decision 16.61, which
                  reverses 3.6's `h-10` beside the selector), enforced by
                  the row rather than asked of each button: a row where one
                  button had adopted `usePageActionClassName` and its
                  neighbours still said `sm:h-8` showed two heights side by
                  side. The descendant selector outranks a button's own
                  `h-*`/`sm:h-*` class.

                  Switches and checkboxes are buttons too and keep their own
                  size. The rule sets the height only: an icon-only `h-8 w-8`
                  button becomes 32x36. Decision 3.6 removes those variants
                  (full width with a label on phones); it does not square them.
                */
                "[&_button:not([role=switch]):not([role=checkbox])]:h-9",
              )}
            >
              {/* Tells each button it sits in the page's action row, which
                  gives it the row's height (decision 16.61). */}
              <PageToolbarProvider hasContext={Boolean(context)}>
                {actions}
              </PageToolbarProvider>
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  );
};

/**
 * The layout of a page's action buttons, the one the legacy screens use and
 * the user asked for everywhere (decision 3.6): on a phone every button
 * stacks at full width WITH its label — Atualizar included, not an icon
 * squeezed beside the others — and from `sm` they share one right-aligned
 * row that wraps when it stops fitting.
 *
 * Children are the buttons or their wrappers (a Tooltip's `div`); each one
 * takes the full width below `sm`. Buttons inside should use
 * `usePageActionClassName()` for their height.
 */
const PageActions = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element => (
  <div
    data-page-actions
    className={cn(
      `flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto
      sm:flex-row sm:flex-wrap sm:items-center sm:justify-end
      [&>*]:w-full sm:[&>*]:w-auto`,
      className,
    )}
  >
    {children}
  </div>
);

export { ProtectedPageToolbar, PageActions };
