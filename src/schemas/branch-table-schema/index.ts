import { z } from "zod";

export const branchTableSchema = z.object({
  id: z.string(),
  corporate_reason: z.string(),
  fantasy_name: z.string().nullable().optional(),
  cep: z.string(),
  city: z.string(),
  uf: z.string(),
  street: z.string(),
  address_number: z.string(),
  cnpj: z.string(),
  complement: z.string().nullable().optional(),
  cnae: z.string(),
  erp_code: z.string().nullable().optional(),
  responsible_name: z.string(),
  telephone: z.string(),
  email: z.string(),
  business_name: z.string().optional(),
  businessId: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type branchTableSchema = z.infer<typeof branchTableSchema>;
