interface DashboardPartProps {
  id: string;
  description: string;
  unit_price: string | number;
  supplierId?: string | null;
  supplier?: {
    name: string;
  } | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export type { DashboardPartProps };
