interface PartProps {
  id: string;
  description: string;
  unit_price: string | number;
  businessId?: string | null;
  supplierId?: string | null;
  business?: {
    corporate_reason: string;
  } | null;
  supplier?: {
    name: string;
  } | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export type { PartProps };
