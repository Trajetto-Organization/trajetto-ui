interface DataButtonRevalidateProps {
  rateLimit?: {
    maxClicks?: number;
    timeWindowMs?: number;
    cooldownTimeMs?: number;
    storageKey?: string; // Custom key for localStorage
  };
  className?: string;
  buttonClassName?: string;

  /**
   * What the click refreshes instead of the whole tab, when the open tab
   * reads only its own queries (Sistema). Never rejects.
   */
  onRevalidate?: () => Promise<void>;
}

export type { DataButtonRevalidateProps };
