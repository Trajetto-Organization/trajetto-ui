interface MaintenanceCost {
  month?: string;
  date?: string;
  internal: number;
  external: number;
}

interface ChartBarDefaultProps {
  maintenanceCosts: MaintenanceCost[];
}

export type { ChartBarDefaultProps };
