interface SupplierProps {
  id: string;
  name: string;
  cnpj: string;
  cep?: string | null;
  city?: string | null;
  uf?: string | null;
  street?: string | null;
  address_number?: string | null;
  complement?: string | null;
  telephone?: string | null;
  email?: string | null;
  businessId: string;
  business?: {
    corporate_reason: string;
  } | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export type { SupplierProps };
