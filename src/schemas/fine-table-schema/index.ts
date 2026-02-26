import { z } from "zod";

export const fineTableSchema = z.object({
  id: z.string(),
  violation_date: z.union([z.string(), z.date()]),
  due_date: z.union([z.string(), z.date()]),
  payment_date: z.union([z.string(), z.date()]).nullable().optional(),
  amount: z.union([z.number(), z.string()]), // Prisma Decimal vem como string
  points: z.number(),
  location: z.string().nullable().optional(),
  observation: z.string().nullable().optional(),
  businessId: z.string(),
  branchId: z.string(),
  driverId: z.string(),
  vehicleId: z.string(),
  trafficViolationCodeId: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  latitude_original: z.number().nullable().optional(),
  longitude_original: z.number().nullable().optional(),
  location_source: z.string().nullable().optional(),
  location_edited_by: z.string().nullable().optional(),
  location_edited_at: z.union([z.string(), z.date()]).nullable().optional(),
  created_from: z.string(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .optional(),
  branch: z.object({
    corporate_reason: z.string(),
  }),
  driver: z.object({
    name: z.string(),
    cpf: z.string(),
  }),
  vehicle: z.object({
    license_plate: z.string(),
    description: z.string(),
  }),
  trafficViolationCode: z.object({
    code: z.string(),
    sub_code: z.union([z.string(), z.number()]), // Pode vir como número do backend
    description: z.string(),
    gravity: z.string(),
    points: z.number(),
  }),
});

export type fineTableSchema = z.infer<typeof fineTableSchema>;
