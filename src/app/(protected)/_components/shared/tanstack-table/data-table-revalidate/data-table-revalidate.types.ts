type RateLimitConfig = {
  maxClicks?: number; // Maximum number of clicks allowed
  timeWindowMs?: number; // Time window in ms to count clicks
  cooldownTimeMs?: number; // Waiting time when limit is exceeded
  storageKey?: string; // Custom key for localStorage
};

/**
 * "Atualizar" refreshes the whole tab (decision 2.1): there is no
 * per-page list of what to refresh, so the button takes none.
 */
interface DataTableRevalidateProps {
  /** Below `sm` the button keeps the arrows and drops the words. */
  hideLabelOnMobile?: boolean;
  /** Defaults to the action row's height, h-9 (decision 16.61). */
  className?: string;
  rateLimit?: RateLimitConfig;
}

export type { RateLimitConfig, DataTableRevalidateProps };
