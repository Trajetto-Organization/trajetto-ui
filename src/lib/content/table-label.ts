import type { ComponentPropsWithoutRef } from "react";

/**
 * The accessible name of a markdown table's scroll region.
 *
 * Every table used to be a region called "Tabela": a screen reader listing
 * the landmarks heard the same name for each one and could not tell them
 * apart. The MDX pipeline (rehypeTableLabels in ./mdx) now hands each table
 * the section it sits in through this prop, and the table component turns
 * it into the region's name. Kept apart from ./mdx so the components do not
 * import the MDX compiler.
 */

/** The prop the rehype plugin sets on <table> (hast `dataTableLabel`). */
export const TABLE_LABEL_PROP = "data-table-label";

export type TableProps = ComponentPropsWithoutRef<"table"> & {
  [TABLE_LABEL_PROP]?: string;
};

/** The region's name: the section's label, or a plain "Tabela" outside the pipeline. */
export function tableRegionLabel(label: string | undefined): string {
  const text = label?.trim();

  return text ? text : "Tabela";
}
