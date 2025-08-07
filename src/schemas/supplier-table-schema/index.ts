import { z } from "zod";

export const supplierTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  cnpj: z.string(),
  cep: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  uf: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  address_number: z.string().nullable().optional(),
  complement: z.string().nullable().optional(),
  telephone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  businessId: z.string().optional(),
  business_name: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type supplierTableSchema = z.infer<typeof supplierTableSchema>;
