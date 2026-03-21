import { z } from "zod";

export const vehicleChecklistTableSchema = z.object({
  id: z.string(),
  current_mileage: z.number(),
  checklist_date: z.union([z.date(), z.string()]),
  tires_condition: z.string(),
  headlights_working: z.boolean(),
  taillights_working: z.boolean(),
  turn_signals_working: z.boolean(),
  bumpers_condition: z.string(),
  windshield_condition: z.string(),
  mirrors_condition: z.string(),
  seatbelts_working: z.boolean(),
  dashboard_working: z.boolean(),
  steering_wheel_condition: z.string(),
  brakes_working: z.boolean(),
  clutch_working: z.boolean(),
  fuel_level_adequate: z.boolean(),
  oil_level_adequate: z.boolean(),
  radiator_water_adequate: z.boolean(),
  brake_fluid_adequate: z.boolean(),
  battery_condition: z.string(),
  driver_license_valid: z.boolean(),
  vehicle_documents_valid: z.boolean(),
  insurance_valid: z.boolean(),
  fire_extinguisher_valid: z.boolean(),
  warning_triangle_present: z.boolean(),
  jack_present: z.boolean(),
  spare_tire_condition: z.string(),
  notes: z.string().nullable().optional(),
  photos: z.array(z.string()).optional(),
  overall_condition: z.string(),
  businessId: z.string(),
  branchId: z.string(),
  vehicleId: z.string(),
  driverId: z.string(),
  business: z
    .object({
      corporate_reason: z.string(),
      fantasy_name: z.string().nullable(),
    })
    .optional(),
  branch: z.object({
    corporate_reason: z.string(),
    fantasy_name: z.string().nullable(),
  }),
  vehicle: z.object({
    description: z.string(),
    license_plate: z.string(),
    brand: z.string(),
    model: z.string(),
    current_mileage: z.number(),
  }),
  driver: z.object({
    name: z.string(),
    cnh: z.string(),
  }),
  ai_verification_status: z.string().optional(),
  ai_verification_details: z.any().nullable().optional(),
  ai_verified_at: z.union([z.date(), z.string()]).nullable().optional(),
  photos_by_field: z.any().nullable().optional(),
  created_at: z.union([z.date(), z.string()]),
  updated_at: z.union([z.date(), z.string()]),
});

export type vehicleChecklistTableSchema = z.infer<
  typeof vehicleChecklistTableSchema
>;
