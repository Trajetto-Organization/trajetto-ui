import { z } from "zod";

export const vehicleTypeTableSchema = z.object({
  id: z.string(),
  description: z.string(),
  number_of_axles: z.number(),
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

export type vehicleTypeTableSchema = z.infer<typeof vehicleTypeTableSchema>;
