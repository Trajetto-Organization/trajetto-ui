interface LimitsContentProps {
  businessId?: string;
  mode: "admin" | "dashboard";
  showBusinessSelector: boolean;
}

interface UseLimitsContent {
  businessId?: string;
}

export type { LimitsContentProps, UseLimitsContent };
