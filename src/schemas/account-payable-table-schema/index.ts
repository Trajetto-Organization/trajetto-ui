import { z } from "zod";

export const accountPayableTableSchema = z.object({
  id: z.string(),
  issue_date: z.union([z.string(), z.date()]),
  due_date: z.union([z.string(), z.date()]),
  payment_date: z.union([z.string(), z.date()]).nullable(),
  amount: z.number(),
  amount_paid: z.number().nullable(),
  category: z.string().nullable().optional(),
  category_description: z.string().nullable().optional(),
  businessId: z.string(),
  branchId: z.string(),
  serviceOrderId: z.string().nullable(),
  registrationUserId: z.string(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  business: z
    .object({
      corporate_reason: z.string(),
    })
    .optional(),
  branch: z
    .object({
      corporate_reason: z.string(),
      fantasy_name: z.string().nullable(),
    })
    .optional(),
  serviceOrder: z
    .object({
      id: z.string(),
      date: z.union([z.string(), z.date()]),
      maintenance_type: z.string(),
      vehicle: z.object({
        license_plate: z.string(),
        description: z.string(),
      }),
    })
    .nullable()
    .optional(),
  registrationUser: z
    .object({
      name: z.string(),
    })
    .optional(),
});

export type accountPayableTableSchema = z.infer<
  typeof accountPayableTableSchema
>;
