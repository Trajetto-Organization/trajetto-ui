import { z } from "zod";

export const fuelTableSchema = z.object({
  id: z.string(),
  created_from: z.string().nullable().optional(),
  current_mileage: z.number(),
  liters_amount: z.number(),
  price_per_liter: z.number(),
  total_amount: z.number(),
  odometer_photo: z.string().nullable(),
  odometer_verified: z.boolean(),
  notes: z.string().nullable().optional(),
  refueling_date: z.union([z.string(), z.date()]),
  businessId: z.string(),
  branchId: z.string(),
  vehicleId: z.string(),
  driverId: z.string(),
  fuelTypeId: z.string(),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .optional(),
  branch: z
    .object({
      corporate_reason: z.string(),
    })
    .optional(),
  vehicle: z
    .object({
      description: z.string(),
      license_plate: z.string(),
      brand: z.string(),
      model: z.string(),
    })
    .optional(),
  driver: z
    .object({
      name: z.string(),
      cnh: z.string(),
    })
    .optional(),
  fuelType: z
    .object({
      description: z.string(),
    })
    .optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  odometer_ai_status: z.string().optional(),
  odometer_ai_reading: z.number().nullable().optional(),
  odometer_ai_details: z.any().nullable().optional(),
  odometer_ai_analyzed_at: z
    .union([z.string(), z.date()])
    .nullable()
    .optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type fuelTableSchema = z.infer<typeof fuelTableSchema>;
