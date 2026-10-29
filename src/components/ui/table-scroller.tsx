"use client";

import * as React from "react";

/**
 * The box a wide table scrolls inside, and the only part of a table that needs
 * the browser.
 *
 * This exists as a file of its own because of where the `"use client"` on
 * line 1 sits. `table.tsx` used to hold this measurement, which made the whole
 * table family — header, body, row, cell, caption, all of them pure markup —
 * unusable from a Server Component: a `loading.tsx` that rendered `<Table>`
 * crashed with "useRef only works in Client Components", and the screen
 * answered with the error page.
 *
 * The obvious repair was to put the directive on `table.tsx`. That works and
 * costs more than it looks: every skeleton in the product would stop being
 * server-rendered markup and start being a client component shipping
 * JavaScript to animate nothing. The boundary belongs around the part that
 * measures, not around the part that renders `<td>`.
 *
 * So: one small client leaf, and `table.tsx` stays universal — it compiles
 * into whichever graph imports it, server or client, which is what a
 * presentational primitive should do.
 */

/**
 * Whether this box has more inside it than it can show.
 *
 * A table wider than its column of the page scrolls sideways, and a
 * scrollable box that nothing can focus is unreachable by keyboard: the rows
 * are on the page, the person cannot get to them, and no error is shown. Axe
 * calls it `scrollable-region-focusable`, and the dashboard's activity table
 * fails it on a phone.
 *
 * Measured rather than assumed, because the answer changes with the data and
 * the viewport: a table that fits needs no tab stop, and adding one to every
 * table in the product would put a stop with nothing in it in front of every
 * keyboard user, on every screen.
 */
function useOverflows(ref: React.RefObject<HTMLElement>): boolean {
  const [overflows, setOverflows] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;

    if (!node) return;

    const measure = () => setOverflows(node.scrollWidth - node.clientWidth > 2);

    measure();

    // Both matter: the window resizing, and the table itself changing — a
    // filter that drops a column, a page of rows with longer names.
    const observer = new ResizeObserver(measure);

    observer.observe(node);

    if (node.firstElementChild) observer.observe(node.firstElementChild);

    return () => observer.disconnect();
  }, [ref]);

  return overflows;
}

const TableScroller = ({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element => {
  const scroller = React.useRef<HTMLDivElement>(null);

  const overflows = useOverflows(scroller);

  return (
    <div
      ref={scroller}
      className="relative w-full overflow-auto"
      // Only when there is something to scroll to. `role` and the name come
      // with it, so a screen reader announces what the tab stop is for
      // instead of landing on an anonymous box.
      {...(overflows
        ? {
            tabIndex: 0,
            role: "region",
            "aria-label": "Tabela com rolagem horizontal",
          }
        : {})}
    >
      {children}
    </div>
  );
};

export { TableScroller, useOverflows };
