import { z } from "zod";

export const businessTableSchema = z.object({
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
  is_active: z.boolean().optional(),
  vehicle_limit: z.number().optional(),
  vehicle_count: z.number().optional(),
  // The company's clock (decision 1.1); older API builds do not send it.
  timezone: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type businessTableSchema = z.infer<typeof businessTableSchema>;
