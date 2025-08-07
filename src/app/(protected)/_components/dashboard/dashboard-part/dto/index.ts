interface DashboardPartProps {
  id: string;
  description: string;
  unit_price: string;
  supplierId?: string | null;
  supplierName: string;
  created_at: string;
  updated_at: string;
}

export type { DashboardPartProps };
