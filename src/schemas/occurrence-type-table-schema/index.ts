import { z } from "zod";

export const occurrenceTypeTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  requires_photo: z.boolean(),
  blocks_delivery: z.boolean(),
  is_active: z.boolean(),
  businessId: z.string(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type occurrenceTypeTableSchema = z.infer<
  typeof occurrenceTypeTableSchema
>;
