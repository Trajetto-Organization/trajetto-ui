interface DataButtonRevalidateProps {
  rateLimit?: {
    maxClicks?: number;
    timeWindowMs?: number;
    cooldownTimeMs?: number;
    storageKey?: string; // Custom key for localStorage
  };
  className?: string;
  buttonClassName?: string;
}

export type { DataButtonRevalidateProps };
