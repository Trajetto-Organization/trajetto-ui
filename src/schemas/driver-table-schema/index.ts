import { z } from "zod";

export const driverTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  birth_date: z.union([z.string(), z.date()]),
  cnh: z.string(),
  cpf: z.string(),
  rg: z.string(),
  cep: z.string(),
  city: z.string(),
  uf: z.string(),
  street: z.string(),
  address_number: z.string(),
  complement: z.string().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  contract_type: z.enum(["OWNED", "THIRD_PARTY"]),
  businessId: z.string(),
  branchId: z.string().nullable(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .nullable()
    .optional(),
  branch: z
    .object({
      corporate_reason: z.string(),
    })
    .nullable()
    .optional(),
});

export type driverTableSchema = z.infer<typeof driverTableSchema>;
