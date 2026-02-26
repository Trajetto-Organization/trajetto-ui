import { z } from "zod";

export const partTableSchema = z.object({
  id: z.string(),
  description: z.string(),
  unit_price: z.union([z.string(), z.number()]),
  businessId: z.string().optional(),
  supplierId: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  supplier: z
    .object({
      name: z.string(),
    })
    .nullable()
    .optional(),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .nullable()
    .optional(),
});

export type partTableSchema = z.infer<typeof partTableSchema>;
