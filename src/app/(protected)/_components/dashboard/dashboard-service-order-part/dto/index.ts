interface DashboardServiceOrderPartProps {
  id: string;
  unit_price: string;
  quantity: number;
  discount_percentage: string;
  businessId: string;
  business_name?: string;
  vehicleLicensePlate: string;
  vehicleDescription: string;
  serviceOrderId: string;
  serviceOrderDescription?: string;
  serviceOrderDate: string;
  partId: string;
  partDescription: string;
  partUnitPrice: string;
  totalPrice: string;
  totalWithDiscount: string;
  created_at: string;
  updated_at: string;
}

export type { DashboardServiceOrderPartProps };
