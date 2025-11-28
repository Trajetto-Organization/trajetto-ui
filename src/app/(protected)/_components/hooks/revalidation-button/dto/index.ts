interface RevalidateDataState {
  revalidateDataError?: string;
}

type RateLimitConfig = {
  maxClicks?: number; // Maximum number of clicks allowed
  timeWindowMs?: number; // Time window in ms to count clicks
  cooldownTimeMs?: number; // Waiting time when limit is exceeded
  storageKey?: string; // Custom key for localStorage
};

export type { RevalidateDataState, RateLimitConfig };
