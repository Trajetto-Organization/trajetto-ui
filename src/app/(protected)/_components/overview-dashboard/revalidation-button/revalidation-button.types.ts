type RevalidateDataProps =
  | "update-notification"
  | "update-entity-count"
  | "update-vehicle-status"
  | "update-maintenance-stats"
  | "update-recent-activity"
  | "update-vehicle-by-type"
  | "update-maintenance-costs"
  | "update-vehicle-count"
  | "update-driver-count"
  | "update-business-count"
  | "update-branch-count"
  | "update-part-count"
  | "update-supplier-count"
  | "update-service-order-count"
  | "update-user-count"
  | "update-fine-count"
  | "update-ai-usage";

interface DataButtonRevalidateProps {
  revalidateData: RevalidateDataProps[];
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
