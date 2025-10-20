"use client";

import { LucideIcon } from "lucide-react";

import { StatCard, StatCardProps } from "../stat-card";
import { StatsGrid } from "../stats-grid";

/**
 * Interface for configuring an individual stat
 */
export interface StatConfig {
  /** Unique key to identify the stat */
  key: string;
  /** Card title */
  title: string;
  /** Field in the data object that contains the value */
  valueKey: string;
  /** Optional description */
  description?: string;
  /** lucide-react icon */
  icon?: LucideIcon;
  /** Variante de cor */
  variant?: StatCardProps["variant"];
  /** Trend setting */
  trend?: {
    /** Field in the data object that contains the trend value */
    valueKey?: string;
    /** Fixed trend value (if not using valueKey) */
    value?: number;
    /** Label da trend */
    label?: string;
  };
  /** Custom function to format the value */
  formatValue?: (value: any, data: any) => string | number;
  /** Custom function to calculate the value */
  calculateValue?: (data: any) => string | number;
  /** Action when clicking on the card */
  onClick?: () => void;
}

/**
 * PageStats Component Props
 */
export interface PageStatsProps {
  /** Setting the stats to be displayed */
  stats: StatConfig[];
  /** API fetch data */
  data: Record<string, any>;
  /** Loading status */
  isLoading?: boolean;
  /** Number of grid columns (default: 4) */
  columns?: 1 | 2 | 3 | 4;
  /** Additional CSS Classes */
  className?: string;
}

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
export function PageStats({
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
