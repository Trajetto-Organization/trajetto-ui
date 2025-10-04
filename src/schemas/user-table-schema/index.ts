import { z } from "zod";

export const userTableSchema = z.object({
  id: z.string(),
  role: z.string(),
  email: z.string(),
  two_factor_enabled: z.boolean(),
  access_revoked: z.boolean(),
  email_verified: z.boolean(),
  name: z.string(),
  avatar: z.string(),
  corporate_reason: z.string().optional(),
  businessId: z.string(),
  profileAccess: z.string(),
  profileAccessId: z.string(),
  driverId: z.string().optional(),
  driverName: z.string().optional(),
  whatsapp_phone: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type userTableSchema = z.infer<typeof userTableSchema>;
