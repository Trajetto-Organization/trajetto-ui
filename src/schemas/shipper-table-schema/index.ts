import { z } from "zod";

export const shipperTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  cnpj: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  telephone: z.string().nullable().optional(),
  is_active: z.boolean(),
  businessId: z.string(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type shipperTableSchema = z.infer<typeof shipperTableSchema>;
