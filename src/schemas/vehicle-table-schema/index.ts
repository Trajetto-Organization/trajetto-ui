import { z } from "zod";

export const vehicleTableSchema = z.object({
  id: z.string(),
  description: z.string(),
  license_plate: z.string(),
  brand: z.string(),
  model: z.string(),
  acquisition_date: z.union([z.string(), z.date()]),
  fleet_type: z.enum(["OWNED", "THIRD_PARTY"]),
  fleet_id: z.string().nullable(),
  last_maintenance_date: z.union([z.string(), z.date()]).nullable(),
  current_mileage: z.number(),
  last_maintenance_mileage: z.number().nullable(),
  maintenance_interval_km: z.number(),
  maintenance_interval_months: z.number(),
  renavam: z.string(),
  manufacturing_year: z.union([z.number(), z.string()]),
  model_year: z.union([z.number(), z.string()]),
  km_per_liter: z.number(),
  number_of_axles: z.number(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "IN_ROUTE"]),
  vehicleTypeId: z.string().nullable(),
  fuelTypeId: z.string(),
  driverId: z.string().nullable(),
  branchId: z.string().nullable(),
  businessId: z.string(),
  last_fuel_mileage: z.number().nullable().optional(),
  last_fuel_date: z.union([z.string(), z.date()]).nullable().optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  vehicleType: z
    .object({
      description: z.string(),
    })
    .nullable()
    .optional(),
  fuelType: z
    .object({
      description: z.string(),
    })
    .optional(),
  driver: z
    .object({
      name: z.string(),
      cnh: z.string(),
    })
    .nullable()
    .optional(),
  branch: z
    .object({
      corporate_reason: z.string(),
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

export type vehicleTableSchema = z.infer<typeof vehicleTableSchema>;
