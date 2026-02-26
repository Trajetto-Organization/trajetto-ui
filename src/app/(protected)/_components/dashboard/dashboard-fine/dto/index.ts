interface DashboardFineProps {
  id: string;
  violation_date: string | Date;
  due_date: string | Date;
  payment_date?: string | Date | null;
  amount: number | string; // Prisma Decimal vem como string
  points: number;
  location?: string | null;
  observation?: string | null;
  businessId: string;
  branchId: string;
  driverId: string;
  vehicleId: string;
  trafficViolationCodeId: string;
  created_from: string;
  created_at: string | Date;
  updated_at: string | Date;
  // 📍 GEOLOCATION: Final location (edited or original)
  latitude?: number | null;
  longitude?: number | null;
  // 📍 GEOLOCATION: Original GPS location (before any manual editing)
  latitude_original?: number | null;
  longitude_original?: number | null;
  // 🆕 GEOLOCATION AUDIT: Track location source and edits
  location_source?: string | null;
  location_edited_by?: string | null;
  location_edited_at?: string | Date | null;
  branch: {
    corporate_reason: string;
  };
  driver: {
    name: string;
    cpf: string;
  };
  vehicle: {
    license_plate: string;
    description: string;
  };
  trafficViolationCode: {
    code: string;
    sub_code: string | number; // Pode vir como número do backend
    description: string;
    gravity: string;
    points: number;
  };
}

export type { DashboardFineProps };
