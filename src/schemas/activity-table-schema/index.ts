import { z } from "zod";

export const activityTableSchema = z.object({
  id: z.string(),
  type: z.string(),
  action: z.string(),
  entityId: z.string(),
  description: z.string(),
  status: z.string(),
  performedBy: z.string(),
  businessId: z.string().nullable(),
  userEmail: z.string(),
  userName: z.string(),
  userRole: z.string(),
  business_name: z.string().optional(), // Only for MASTER
  created_at: z.string(),
  updated_at: z.string(),
});

export type activityTableSchema = z.infer<typeof activityTableSchema>;
