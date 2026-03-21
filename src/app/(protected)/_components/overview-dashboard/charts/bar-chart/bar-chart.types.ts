interface MaintenanceCost {
  month?: string;
  date?: string;
  preventive: number;
  corrective: number;
}

interface ChartBarDefaultProps {
  maintenanceCosts: MaintenanceCost[];
}

export type { ChartBarDefaultProps };
