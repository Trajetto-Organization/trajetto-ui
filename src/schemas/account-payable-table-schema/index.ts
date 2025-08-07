import { z } from "zod";

export const accountPayableTableSchema = z.object({
  id: z.string(),
  issue_date: z.string(),
  due_date: z.string(),
  payment_date: z.string().nullable().optional(),
  amount: z.string(),
  amount_paid: z.string().nullable().optional(),
  businessId: z.string(),
  branchId: z.string(),
  serviceOrderId: z.string().nullable().optional(),
  registrationUserId: z.string(),
  branchName: z.string(),
  business_name: z.string().optional(),
  serviceOrderDescription: z.string().optional(),
  status: z.string().optional(),
  registrationUserName: z.string().optional(),
  remainingAmount: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type accountPayableTableSchema = z.infer<
  typeof accountPayableTableSchema
>;
