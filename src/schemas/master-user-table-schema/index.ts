import { z } from "zod";

export const masterUserTableSchema = z.object({
  id: z.string(),
  role: z.string(),
  email: z.string(),
  email_verified: z.string().nullable().optional(),
  two_factor_enabled: z.boolean(),
  access_revoked: z.boolean(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  whatsapp_phone: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type masterUserTableSchema = z.infer<typeof masterUserTableSchema>;
