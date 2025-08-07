interface DashboardFineProps {
  id: string;
  violation_date: string;
  due_date: string;
  payment_date?: string | null;
  amount: string;
  points: number;
  location?: string | null;
  observation?: string | null;
  businessId: string;
  branchId: string;
  driverId: string;
  vehicleId: string;
  trafficViolationCodeId: string;
  created_at: string;
  updated_at: string;
  branchName?: string;
  driverName?: string;
  driverCpf?: string;
  vehicleLicensePlate?: string;
  vehicleDescription?: string;
  violationCode?: string;
  violationDescription?: string;
}

export type { DashboardFineProps };
