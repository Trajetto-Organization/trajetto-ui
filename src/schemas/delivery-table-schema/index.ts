import { z } from "zod";

const deliveryStatusSchema = z.enum([
  "PENDING",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]);

export const deliveryTableSchema = z.object({
  id: z.string(),
  code: z.string().nullable().optional(),
  invoice_key: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  recipient_name: z.string(),
  city: z.string(),
  uf: z.string(),
  status: deliveryStatusSchema,
  scheduled_date: z.union([z.string(), z.date()]).nullable().optional(),
  delivered_at: z.union([z.string(), z.date()]).nullable().optional(),
  shipper: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  driver: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  vehicle: z
    .object({ id: z.string(), license_plate: z.string() })
    .nullable()
    .optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type deliveryTableSchema = z.infer<typeof deliveryTableSchema>;
export { deliveryStatusSchema };
