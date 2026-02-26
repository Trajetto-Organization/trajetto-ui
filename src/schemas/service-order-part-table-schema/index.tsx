import { z } from "zod";

export const serviceOrderPartTableSchema = z.object({
  id: z.string(),
  unit_price: z.union([z.string(), z.number()]),
  quantity: z.number(),
  discount_percentage: z.union([z.string(), z.number()]).nullable().optional(),
  businessId: z.string(),
  serviceOrderId: z.string(),
  partId: z.string(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  part: z.object({
    id: z.string(),
    description: z.string(),
    unit_price: z.union([z.string(), z.number()]),
    businessId: z.string(),
    supplierId: z.string().nullable(),
    created_at: z.union([z.string(), z.date()]),
    updated_at: z.union([z.string(), z.date()]),
  }),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .nullable()
    .optional(),
  serviceOrder: z.object({
    id: z.string(),
    date: z.union([z.string(), z.date()]),
    vehicle: z.object({
      license_plate: z.string(),
      description: z.string(),
    }),
  }),
});

export type serviceOrderPartTableSchema = z.infer<
  typeof serviceOrderPartTableSchema
>;
