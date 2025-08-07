import { z } from "zod";

export const fuelTypeTableSchema = z.object({
  id: z.string(),
  description: z.string(),
  businessId: z.string().optional(),
  business_name: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type fuelTypeTableSchema = z.infer<typeof fuelTypeTableSchema>;
