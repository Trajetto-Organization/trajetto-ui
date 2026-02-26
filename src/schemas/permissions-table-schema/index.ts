import { z } from "zod";

export const permissionsTableSchema = z.object({
  id: z.string(),
  action: z.string(),
  permissionKey: z.string(),
  canRead: z.boolean(),
  canWrite: z.boolean(),
  businessId: z.string(),
  profileAccessId: z.string(),
  profileAccess: z.object({
    name: z.string(),
  }),
  business: z
    .object({
      id: z.string(),
      corporate_reason: z.string(),
    })
    .optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type permissionsTableSchema = z.infer<typeof permissionsTableSchema>;
