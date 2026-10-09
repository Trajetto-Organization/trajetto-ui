import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatCardProps } from "./stat-card.types";

const StatCard = ({
  title,
  value,
  change,
  icon,
  color,
  comparison = "vs. mês anterior",
  comparisonTitle,
}: StatCardProps): JSX.Element => {
  const percent = `${change > 0 ? "+" : ""}${change}%`;
  const caption = `${percent} ${comparison}`;

  return (
    // h-full down the chain: the grid stretches every cell of a row (and
    // auto-rows-fr every row) to one height, the card has to follow it.
    <div
      data-stat-card
      className="h-full transition-transform duration-200 ease-out hover:-translate-y-1"
    >
      <Card className="h-full overflow-hidden shadow-md">
        <div className="flex h-full">
          {/* A fixed band, not a quarter of the card: at 1024px with the
              sidebar a quarter was 38px minus 32px of padding, and the icon
              was squeezed to a dot. w-14 with a size-5 icon reads as the
              card's colour (w-11 looked like a stripe); w-12 and px-2.5 in
              the 768-1023px band (sidebar, 190px cards) keep "Ordens de Serviço" uncut. */}
          <div
            data-stat-card-band
            className="flex w-14 shrink-0 items-center justify-center md:w-12 lg:w-14 [&_svg]:size-5"
            style={{ backgroundColor: color }}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <CardHeader className="px-3 pb-2 pt-4 md:px-2.5 lg:px-3">
              <CardTitle className="truncate text-sm font-medium" title={title}>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 pt-0 md:px-2.5 lg:px-3">
              <div className="text-2xl font-bold">{value}</div>
              <p
                data-stat-card-caption
                // Screen readers get the full sentence below instead.
                aria-hidden="true"
                // At most two lines, and no reserved second line: the grid's
                // auto-rows-fr already equalises a row, and a forced min-height
                // left an empty strip under every one-line caption. The full
                // sentence stays on hover and for screen readers.
                title={`${percent} ${comparisonTitle ?? comparison}`}
                // The 600 shades read at 3.29:1 on a white card at 12px, under
                // the 4.5:1 that small text needs. The 700 shades carry the same
                // meaning and clear it.
                className={`mt-1 line-clamp-2 text-xs leading-4 ${
                  change > 0
                    ? "text-green-700 dark:text-green-400"
                    : change < 0
                      ? "text-red-700 dark:text-red-400"
                      : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {caption}
              </p>
              {/* Touch screens have no hover for the title tooltip; the
                  "same period" nuance still reaches assistive technology.
                  select-none keeps it out of a copy, which otherwise pasted
                  the short and the long caption one after the other. */}
              <span
                data-stat-card-sr
                className="sr-only select-none"
              >{`${percent} ${comparisonTitle ?? comparison}`}</span>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
};

/**
 * The grid of count cards. auto-rows-fr makes every row as tall as the
 * tallest card, and each StatCard fills its cell, so no card stands out at
 * any width (one to four columns).
 */
const StatCardGrid = ({ children }: { children: ReactNode }): JSX.Element => (
  <div
    className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    data-cards
    data-tutorial="dashboard-cards"
  >
    {children}
  </div>
);

export { StatCard, StatCardGrid };
