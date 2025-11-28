import { z } from "zod";

export const serviceOrderTableSchema = z.object({
  id: z.string(),
  date: z.string(),
  completion_date: z.string().nullable().optional(),
  maintenance_type: z.enum(["INTERNAL", "EXTERNAL"]),
  total_amount: z.string(),
  current_mileage_at_service: z.number().optional().nullable(),
  maintenance_interval_km_at_service: z.number().optional().nullable(),
  last_maintenance_mileage_at_service: z.number().optional().nullable(),
  new_mileage_after_service: z.number().optional().nullable(),
  businessId: z.string().optional(),
  vehicleId: z.string(),
  responsibleUserId: z.string(),
  branchId: z.string(),
  supplierId: z.string().nullable().optional(),
  vehicleLicensePlate: z.string().nullable().optional(),
  vehicleDescription: z.string().nullable().optional(),
  responsibleUserName: z.string().nullable().optional(),
  responsibleUserEmail: z.string().nullable().optional(),
  branchName: z.string(),
  business_name: z.string().optional(),
  supplierName: z.string().nullable().optional(),
  partsCount: z.number().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type serviceOrderTableSchema = z.infer<typeof serviceOrderTableSchema>;
