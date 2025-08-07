import { z } from "zod";

export const serviceOrderPartTableSchema = z.object({
  id: z.string(),
  unit_price: z.string(),
  quantity: z.number(),
  discount_percentage: z.string(),
  businessId: z.string(),
  business_name: z.string().optional(),
  serviceOrderId: z.string(),
  serviceOrderDate: z.string(),
  vehicleLicensePlate: z.string(),
  vehicleDescription: z.string(),
  partId: z.string(),
  partDescription: z.string(),
  partUnitPrice: z.string(),
  totalPrice: z.string(),
  totalWithDiscount: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type serviceOrderPartTableSchema = z.infer<
  typeof serviceOrderPartTableSchema
>;
