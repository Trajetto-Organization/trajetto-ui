interface DashboardBranchProps {
  id: string;
  corporate_reason: string;
  fantasy_name?: string | null;
  cep: string;
  city: string;
  uf: string;
  street: string;
  address_number: string;
  cnpj: string;
  complement?: string | null;
  cnae: string;
  erp_code?: string | null;
  responsible_name: string;
  telephone: string;
  email: string;
  businessId: string;
  business_name?: string;
  created_at: string;
  updated_at: string;
}

export type { DashboardBranchProps };
