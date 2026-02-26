import { z } from "zod";

export const fuelTypeTableSchema = z.object({
  id: z.string(),
  description: z.string(),
  businessId: z.string(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .nullable()
    .optional(),
});

export type fuelTypeTableSchema = z.infer<typeof fuelTypeTableSchema>;
