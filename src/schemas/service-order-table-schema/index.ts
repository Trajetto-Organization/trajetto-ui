import { z } from "zod";

export const serviceOrderTableSchema = z.object({
  id: z.string(),
  date: z.union([z.string(), z.date()]),
  completion_date: z.union([z.string(), z.date()]).nullable(),
  maintenance_type: z.enum(["INTERNAL", "EXTERNAL"]),
  total_amount: z.union([z.number(), z.string()]),
  description: z.string().nullable().optional(),
  current_mileage_at_service: z.number().nullable(),
  maintenance_interval_km_at_service: z.number().nullable(),
  last_maintenance_mileage_at_service: z.number().nullable(),
  new_mileage_after_service: z.number().nullable(),
  businessId: z.string(),
  vehicleId: z.string(),
  responsibleUserId: z.string(),
  branchId: z.string(),
  supplierId: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  latitude_original: z.number().nullable(),
  longitude_original: z.number().nullable(),
  location_source: z.string().nullable(),
  location_edited_by: z.string().nullable(),
  location_edited_at: z.union([z.string(), z.date()]).nullable(),
  created_from: z.enum(["WEB", "MOBILE", "WEB_DASHBOARD"]),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .optional(),
  vehicle: z
    .object({
      license_plate: z.string(),
      description: z.string(),
    })
    .optional(),
  responsibleUser: z
    .object({
      name: z.string(),
      email: z.string(),
    })
    .optional(),
  branch: z
    .object({
      corporate_reason: z.string(),
      fantasy_name: z.string(),
    })
    .optional(),
  supplier: z
    .object({
      name: z.string(),
    })
    .nullable()
    .optional(),
  parts: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number(),
        unit_price: z.union([z.number(), z.string()]),
        serviceOrderId: z.string(),
        partId: z.string(),
        part: z.object({
          id: z.string(),
          description: z.string(),
        }),
      }),
    )
    .optional(),
});

export type serviceOrderTableSchema = z.infer<typeof serviceOrderTableSchema>;
