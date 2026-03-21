interface DashboardDriverProps {
  id: string;
  name: string;
  birth_date: Date | string;
  cnh: string;
  cpf: string;
  rg: string;
  cep: string;
  city: string;
  uf: string;
  street: string;
  address_number: string;
  complement: string | null;
  status: "ACTIVE" | "INACTIVE";
  contract_type: "OWNED" | "THIRD_PARTY";
  businessId: string;
  branchId: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  branch?: {
    corporate_reason: string;
  } | null;
}

export type { DashboardDriverProps };
