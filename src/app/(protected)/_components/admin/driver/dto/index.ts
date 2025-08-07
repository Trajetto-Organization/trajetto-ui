interface DriverProps {
  id: string;
  name: string;
  birth_date: string;
  cnh: string;
  cpf: string;
  rg: string;
  cep: string;
  city: string;
  uf: string;
  street: string;
  address_number: string;
  complement: string;
  status: "ACTIVE" | "INACTIVE";
  contract_type: "OWNED" | "THIRD_PARTY";
  businessId?: string;
  business_name?: string;
  branchId?: string | null;
  branchName?: string | null;
  created_at: string;
  updated_at: string;
}

export type { DriverProps };
