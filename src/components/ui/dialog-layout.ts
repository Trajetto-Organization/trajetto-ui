import { createContext } from "react";

/**
 * The footer rule for modals (decision 3.2), as code instead of a convention.
 *
 * A modal up to `max-w-xl` puts Cancelar and the main action side by side,
 * each taking half the row — the Criar Embarcador dialog the user holds up as
 * the reference. A larger modal (a long form, a wide table) keeps its buttons
 * to the right, where the eye ends a long read. Every dialog wrote its own
 * footer and about ten had drifted, so the dialog now decides from its own
 * width and the footer follows.
 */
type DialogFooterLayout = "fill" | "end";

/** `max-w-xl` is the widest modal whose footer fills, in rem. */
const FILL_MAX_REM = 36;

/** Tailwind's named `max-w-*` sizes, in rem. */
const NAMED_REM: Record<string, number> = {
  "0": 0,
  xs: 20,
  sm: 24,
  md: 28,
  lg: 32,
  xl: 36,
  "2xl": 42,
  "3xl": 48,
  "4xl": 56,
  "5xl": 64,
  "6xl": 72,
  "7xl": 80,
  prose: 32.5,
};

const BREAKPOINTS = ["", "sm", "md", "lg", "xl", "2xl"];

/**
 * How wide a `max-w-*` value is, in rem; `Infinity` for anything tied to the
 * viewport or unbounded (`full`, `screen-*`, `[95vw]`, `calc(...)`), which is
 * the large-modal case by definition.
 */
function maxWidthRem(value: string): number | null {
  if (value in NAMED_REM) return NAMED_REM[value];

  if (value === "full" || value === "none" || value.startsWith("screen")) {
    return Infinity;
  }

  const arbitrary = /^\[(.+)\]$/.exec(value)?.[1];

  if (!arbitrary) return null;

  const px = /^(\d+(?:\.\d+)?)px$/.exec(arbitrary);
  if (px) return Number(px[1]) / 16;

  const rem = /^(\d+(?:\.\d+)?)rem$/.exec(arbitrary);
  if (rem) return Number(rem[1]);

  return Infinity;
}

/**
 * The footer layout a dialog's classes imply.
 *
 * Read at the widest breakpoint the classes mention, because the rule is
 * about the modal as a desktop sees it — below `sm` every modal is edge to
 * edge anyway. No `max-w-*` at all means the primitive's own `max-w-lg`.
 */
function dialogFooterLayoutFor(className?: string | null): DialogFooterLayout {
  let widest: { breakpoint: number; rem: number } | null = null;

  for (const token of (className ?? "").split(/\s+/)) {
    const match = /^(?:!)?(?:(sm|md|lg|xl|2xl):)?(?:!)?max-w-(.+)$/.exec(token);

    if (!match) continue;

    const rem = maxWidthRem(match[2]);

    if (rem === null) continue;

    const breakpoint = BREAKPOINTS.indexOf(match[1] ?? "");

    if (!widest || breakpoint >= widest.breakpoint) {
      widest = { breakpoint, rem };
    }
  }

  return widest && widest.rem > FILL_MAX_REM ? "end" : "fill";
}

/**
 * The classes of each layout.
 *
 * `fill`: one row at every width, each child an equal share (`min-w-0` so a
 * long label truncates instead of pushing its neighbour out).
 * `end`: stacked full width on a phone with the main action on top, a
 * right-aligned row from `sm`.
 */
function dialogFooterClassName(layout: DialogFooterLayout): string {
  return `mt-6 ${dialogFooterRowClassName(layout)}`;
}

/**
 * The same row without the top margin, for the AlertDialog footer: its
 * callers have always set their own `mt-*` (the content's grid gap spaces
 * it otherwise), so the confirmation keeps its spacing and gains the rule.
 */
function dialogFooterRowClassName(layout: DialogFooterLayout): string {
  return layout === "fill"
    ? "flex w-full gap-2 [&>*]:min-w-0 [&>*]:flex-1"
    : "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";
}

/**
 * `justify-center sm:justify-start` for a title or description, unless the
 * caller already chose a `justify-*` — the responsive default must not
 * override a `justify-between` at `sm` and up.
 */
function headerJustifyClass(className?: string | null): string {
  return /(^|\s)([\w-]+:)*justify-/.test(className ?? "")
    ? ""
    : "justify-center sm:justify-start";
}

/** Set by DialogContent / DialogScrollContent from their own classes. */
const DialogLayoutContext = createContext<{ footer: DialogFooterLayout }>({
  footer: "fill",
});

export {
  DialogLayoutContext,
  headerJustifyClass,
  dialogFooterClassName,
  dialogFooterLayoutFor,
  dialogFooterRowClassName,
  FILL_MAX_REM,
};
export type { DialogFooterLayout };
