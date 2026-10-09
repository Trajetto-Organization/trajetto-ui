import type { CnhStatus } from "./lib/driver-rules";

/** One line of GET /driver/list-driver, as the table reads it. */
interface DriverRow {
  id: string;
  name: string;
  /** A civil day stored as UTC midnight (older rows: local midnight); read in UTC. */
  birth_date: string;
  cnh: string;
  cpf: string;
  cnh_category: string | null;
  /** A civil date: "YYYY-MM-DDT00:00:00.000Z", read in UTC. */
  cnh_expires_at: string | null;
  /** Where the CNH stands on the company's business day (computed by the API). */
  cnh_status: CnhStatus | null;
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
  branch: { corporate_reason: string } | null;
  created_at: string;
  updated_at: string;
}

interface DriverListMeta {
  total: number;
  page: number;
  pageSize: number;
}

export type { DriverListMeta, DriverRow };
