import { z } from "zod";

export const fineTableSchema = z.object({
  id: z.string(),
  violation_date: z.string(),
  due_date: z.string(),
  payment_date: z.string().nullable().optional(),
  amount: z.string(),
  points: z.number(),
  location: z.string().nullable().optional(),
  observation: z.string().nullable().optional(),
  businessId: z.string(),
  branchId: z.string(),
  driverId: z.string(),
  vehicleId: z.string(),
  trafficViolationCodeId: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  businessName: z.string().optional(),
  branchName: z.string().optional(),
  driverName: z.string().optional(),
  driverCpf: z.string().optional(),
  vehicleLicensePlate: z.string().optional(),
  vehicleDescription: z.string().optional(),
  violationCode: z.string().optional(),
  violationDescription: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export type fineTableSchema = z.infer<typeof fineTableSchema>;
