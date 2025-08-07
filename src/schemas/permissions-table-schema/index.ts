import { z } from "zod";

export const permissionsTableSchema = z.object({
  id: z.string(),
  action: z.string(),
  permission: z.string(),
  canRead: z.boolean(),
  canWrite: z.boolean(),
  businessId: z.string(),
  profileAccessId: z.string(),
  corporate_reason: z.string().optional(),
  profile_name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type permissionsTableSchema = z.infer<typeof permissionsTableSchema>;
