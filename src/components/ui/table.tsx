import * as React from "react";

import { cn } from "@/lib/utils";

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

    const measure = () =>
      setOverflows(node.scrollWidth - node.clientWidth > 2);

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

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => {
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
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
});
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
