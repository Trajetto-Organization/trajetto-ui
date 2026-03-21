"use client";

import {
  PageStatsProps,
  StatCardProps,
  StatConfig,
} from "../shared/common.types";

import { StatCard } from "../stat-card";
import { StatsGrid } from "../stats-grid";

/**
 * Generic component to display statistics for any page
 *
 * @example
 * ```tsx
 * const stats = [
 *   {
 *     key: 'total',
 *     title: 'Total de Usuários',
 *     valueKey: 'totalUsers',
 *     description: 'Cadastrados no sistema',
 *     icon: Users,
 *     variant: 'primary'
 *   },
 *   {
 *     key: '2fa',
 *     title: 'Com 2FA',
 *     valueKey: 'twoFactorEnabled',
 *     icon: Shield,
 *     trend: {
 *       valueKey: 'twoFactorPercentage',
 *       label: 'habilitado'
 *     }
 *   }
 * ];
 *
 * <PageStats stats={stats} data={apiData} isLoading={loading} />
 * ```
 */
function PageStats({
  stats,
  data,
  isLoading = false,
  columns = 4,
  className,
}: PageStatsProps) {
  /**
   * Extracts the value of a field from the data object
   */
  const getValue = (config: StatConfig): string | number => {
    // If you have a custom function, use it.
    if (config.calculateValue) {
      return config.calculateValue(data);
    }

    // Get the field value
    let value = data[config.valueKey];

    // If it has no value, it returns 0
    if (value === undefined || value === null) {
      return 0;
    }

    // If it has a formatting function, use it.
    if (config.formatValue) {
      return config.formatValue(value, data);
    }

    return value;
  };

  /**
   * Extracts the trend configuration if it exists
   */
  const getTrend = (config: StatConfig): StatCardProps["trend"] | undefined => {
    if (!config.trend) return undefined;

    // If it has a fixed value, use it.
    if (config.trend.value !== undefined) {
      return {
        value: config.trend.value,
        label: config.trend.label,
      };
    }

    // If it has a valueKey, get it from the data
    if (config.trend.valueKey) {
      const trendValue = data[config.trend.valueKey];
      if (trendValue !== undefined && trendValue !== null) {
        return {
          value: trendValue,
          label: config.trend.label,
        };
      }
    }

    return undefined;
  };

  return (
    <StatsGrid columns={columns} className={className}>
      {stats.map((stat) => (
        <StatCard
          key={stat.key}
          title={stat.title}
          value={getValue(stat)}
          description={stat.description}
          icon={stat.icon}
          variant={stat.variant}
          trend={getTrend(stat)}
          isLoading={isLoading}
          onClick={stat.onClick}
        />
      ))}
    </StatsGrid>
  );
}

export { PageStats };
