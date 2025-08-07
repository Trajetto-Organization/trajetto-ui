import { z } from "zod";

export const profileAccessTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  corporate_reason: z.string().optional(),
  businessId: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type profileAccessTableSchema = z.infer<typeof profileAccessTableSchema>;
