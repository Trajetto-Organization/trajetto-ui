import { z } from "zod";

export const vehicleTypeTableSchema = z.object({
  id: z.string(),
  description: z.string(),
  number_of_axles: z.number(),
  businessId: z.string().optional(),
  business_name: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type vehicleTypeTableSchema = z.infer<typeof vehicleTypeTableSchema>;
