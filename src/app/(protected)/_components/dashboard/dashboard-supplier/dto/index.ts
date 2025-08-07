interface DashboardSupplierProps {
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
  businessId?: string | null;
  created_at: string;
  updated_at: string;
}

export type { DashboardSupplierProps };
