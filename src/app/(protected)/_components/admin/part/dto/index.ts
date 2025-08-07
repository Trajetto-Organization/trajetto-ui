interface PartProps {
  id: string;
  description: string;
  unit_price: string;
  businessId?: string;
  business_name?: string;
  supplierId?: string | null;
  supplierName: string;
  created_at: string;
  updated_at: string;
}

export type { PartProps };
