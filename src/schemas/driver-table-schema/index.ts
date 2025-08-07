import { z } from "zod";

export const driverTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  birth_date: z.string(),
  cnh: z.string(),
  cpf: z.string(),
  rg: z.string(),
  cep: z.string(),
  city: z.string(),
  uf: z.string(),
  street: z.string(),
  address_number: z.string(),
  complement: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  contract_type: z.enum(["OWNED", "THIRD_PARTY"]),
  businessId: z.string().optional(),
  business_name: z.string().optional(),
  branchId: z.string().nullable().optional(),
  branchName: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type driverTableSchema = z.infer<typeof driverTableSchema>;
