import { z } from "zod";

export const userTableSchema = z.object({
  id: z.string(),
  role: z.string(),
  email: z.string(),
  email_verified: z.string().nullable().optional(),
  two_factor_enabled: z.boolean(),
  access_revoked: z.boolean(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .optional(),
  businessId: z.string().nullable().optional(),
  profileAccessId: z.string().nullable().optional(),
  profileAccess: z
    .object({
      name: z.string(),
    })
    .nullable()
    .optional(),
  driverId: z.string().nullable().optional(),
  driver: z
    .object({
      name: z.string(),
    })
    .nullable()
    .optional(),
  whatsapp_phone: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type userTableSchema = z.infer<typeof userTableSchema>;
