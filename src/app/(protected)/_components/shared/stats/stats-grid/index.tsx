"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  /**
   * Four across only from `xl`, not from `lg`.
   *
   * At 1024px the sidebar takes 256 of the window and the page takes 64 more,
   * so four cards were sharing 655px — 148px each, minus 44 for the icon.
   * "Total de Entregas" does not fit in 104px at any font this product uses,
   * and what the screen showed was four cards reading "Total de...",
   * "Entregu...", "Insuces...". Two cards of 320px say the same thing and
   * can be read.
   */
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  };

  return (
    <div
      data-tutorial="data-page-stats"
      className={cn(
        "grid gap-4 mb-10 animate-in fade-in-50 duration-500",
        gridCols[columns],
        className,
      )}
    >
      {children}
    </div>
  );
}

export { StatsGrid };
