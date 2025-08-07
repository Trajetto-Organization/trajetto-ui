import { z } from "zod";

export const partTableSchema = z.object({
  id: z.string(),
  description: z.string(),
  unit_price: z.string(),
  businessId: z.string().optional(),
  business_name: z.string().optional(),
  supplierId: z.string().nullable().optional(),
  supplierName: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type partTableSchema = z.infer<typeof partTableSchema>;
