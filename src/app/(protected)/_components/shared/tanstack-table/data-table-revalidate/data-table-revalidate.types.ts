import { RevalidateDataProps } from "@/lib/query-keys-mapping";

interface RevalidateDataState {
  revalidateDataError?: string;
}

type RateLimitConfig = {
  maxClicks?: number; // Maximum number of clicks allowed
  timeWindowMs?: number; // Time window in ms to count clicks
  cooldownTimeMs?: number; // Waiting time when limit is exceeded
  storageKey?: string; // Custom key for localStorage
};

interface DataTableRevalidateProps {
  revalidateData: RevalidateDataProps | RevalidateDataProps[];
  rateLimit?: {
    maxClicks?: number;
    timeWindowMs?: number;
    cooldownTimeMs?: number;
    storageKey?: string;
  };
}

export type { RevalidateDataState, RateLimitConfig, DataTableRevalidateProps };
