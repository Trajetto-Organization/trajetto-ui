import { z } from "zod";

export const activityTableSchema = z.object({
  id: z.string(),
  type: z.string(),
  action: z.string(),
  entityId: z.string(),
  description: z.string(),
  status: z.string(),
  performedBy: z.string().nullable(),
  businessId: z.string().nullable(),
  tenantName: z.string().nullable().optional(),
  user: z
    .object({
      email: z.string(),
      role: z.string(),
      name: z.string(),
    })
    .nullish(),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .nullish(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type activityTableSchema = z.infer<typeof activityTableSchema>;
