"use client";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";

import type { DeliveryTab } from "../lib/tabs";
import { STATS_BY_TAB, buildStatsData } from "../lib/stats-config";

interface DeliveriesStatsProps {
  activeTab: DeliveryTab;
  total: number;
  /** The aggregate line the API streams before the rows. */
  searchMeta?: Record<string, unknown>;
}

/**
 * How many across, given how many there are.
 *
 * Every tab asked for four columns regardless. Ocorrências and Motivos have
 * three cards, so a 1440px screen drew three cards and an empty fourth column
 * — 270px of nothing, at the widest part of the page. Monitoramento has six,
 * which four columns break as four and two.
 *
 * The rule is the one a person would apply by eye: use the widest row the
 * cards divide into evenly, never more than four. Three cards go three
 * across, six go three across in two rows, four and eight go four.
 */
const columnsFor = (count: number): 1 | 2 | 3 | 4 => {
  if (count % 4 === 0) return 4;
  if (count % 3 === 0) return 3;

  return Math.min(Math.max(count, 1), 4) as 1 | 2 | 3 | 4;
};

/**
 * Lives on the client because the stat configs carry icon components: a
 * server component may pass such a module across the boundary, but calling
 * its functions there would only reach a client reference.
 */
const DeliveriesStats = ({
  activeTab,
  total,
  searchMeta,
}: DeliveriesStatsProps): JSX.Element | null => {
  const stats = STATS_BY_TAB[activeTab];

  /*
    Nothing at all, rather than an empty grid.

    Four tabs have no cards — Chat, Importações, Mensagens ao Cliente,
    Auditoria — and this used to render a zero-height `<div>` for them. The
    page spaces its children with `space-y-6`, and an invisible child still
    takes a gap: 48px between the sections and the table where there should be
    24, on exactly the tabs with the least to show.
  */
  if (stats.length === 0) return null;

  return (
    <PageStats
      stats={stats}
      data={buildStatsData(activeTab, total, searchMeta)}
      columns={columnsFor(stats.length)}
      /*
        `mb-0` because the page already spaces its own children.

        `StatsGrid` carries `mb-10`, which stacked with the 16px this page
        puts between everything: 12px from the selector to the sections, 16px
        from the sections to the cards, and then 65px from the cards to the
        table. Three gaps that should describe a hierarchy, and the biggest
        one fell in the middle of the content by accident.
      */
      className="mb-0"
    />
  );
};

export { DeliveriesStats };
