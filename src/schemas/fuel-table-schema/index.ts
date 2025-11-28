import { z } from "zod";

export const fuelTableSchema = z.object({
  id: z.string(),
  current_mileage: z.number(),
  liters_amount: z.string(),
  price_per_liter: z.string(),
  total_amount: z.string(),
  odometer_photo: z.string(),
  odometer_verified: z.boolean(),
  notes: z.string().nullable().optional(),
  refueling_date: z.string(),
  businessId: z.string().optional(),
  branchId: z.string(),
  vehicleId: z.string(),
  driverId: z.string(),
  fuelTypeId: z.string(),
  vehicle_license_plate: z.string().nullable().optional(),
  vehicle_description: z.string().nullable().optional(),
  vehicle_brand: z.string().nullable().optional(),
  vehicle_model: z.string().nullable().optional(),
  driver_name: z.string().nullable().optional(),
  driver_cnh: z.string().nullable().optional(),
  branch_name: z.string(),
  business_name: z.string().optional(),
  fuel_type_description: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type fuelTableSchema = z.infer<typeof fuelTableSchema>;
