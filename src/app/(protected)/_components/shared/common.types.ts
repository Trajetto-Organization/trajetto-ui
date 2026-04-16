type UserRole = "MASTER" | "BUSINESS_ADMIN" | "BUSINESS_USER";
type PermissionKey =
  | "branch_manage"
  | "profile_access_manage"
  | "user_permission_manage"
  | "user_registration_manage"
  | "part_manage"
  | "supplier_manage"
  | "vehicle_type_manage"
  | "fuel_type_manage"
  | "driver_manage"
  | "service_order_manage"
  | "service_order_part_manage"
  | "vehicle_manage"
  | "account_payable_manage"
  | "kanban_manage"
  | "fine_manage"
  | "fuel_manage"
  | "vehicle_checklist_manage";

enum EnumPermissionKey {
  BRANCH_MANAGE = "branch_manage",
  PROFILE_ACCESS_MANAGE = "profile_access_manage",
  USER_PERMISSION_MANAGE = "user_permission_manage",
  USER_REGISTRATION_MANAGE = "user_registration_manage",
  PART_MANAGE = "part_manage",
  SUPPLIER_MANAGE = "supplier_manage",
  VEHICLE_TYPE_MANAGE = "vehicle_type_manage",
  FUEL_TYPE_MANAGE = "fuel_type_manage",
  DRIVER_MANAGE = "driver_manage",
  SERVICE_ORDER_MANAGE = "service_order_manage",
  SERVICE_ORDER_PART_MANAGE = "service_order_part_manage",
  VEHICLE_MANAGE = "vehicle_manage",
  ACCOUNT_PAYABLE_MANAGE = "account_payable_manage",
  KANBAN_MANAGE = "kanban_manage",
  FINE_MANAGE = "fine_manage",
  FUEL_MANAGE = "fuel_manage",
  VEHICLE_CHECKLIST_MANAGE = "vehicle_checklist_manage",
}

enum UserBusinessRole {
  BUSINESS_ADMIN = "BUSINESS_ADMIN",
  BUSINESS_USER = "BUSINESS_USER",
}

interface UserPermission {
  id: string;
  action: string;
  canRead: boolean;
  canWrite: boolean;
  permissionKey: PermissionKey;
}

interface Permission {
  permissionKey: PermissionKey;
  canRead: boolean;
  canWrite: boolean;
}

interface ProfileAccess {
  name: string;
  permissions: Permission[];
}

interface UserLoggedProps {
  message: string;
  user: {
    businessId?: string | null;
    id: string;
    role: UserRole;
    email: string;
    two_factor_enabled?: boolean;
    name: string;
    avatar?: string | null;
    profileAccess?: ProfileAccess | null;
    driverId?: string | null;
    driver?: {
      id: string;
      status: string;
    } | null;
    email_notifications_enabled?: boolean;
    activity_notifications_enabled?: boolean;
    access_revoked?: boolean;
  };
}

const roleLabels: Record<UserBusinessRole, string> = {
  [UserBusinessRole.BUSINESS_ADMIN]: "Admin",
  [UserBusinessRole.BUSINESS_USER]: "Usuário",
};

interface CommandBusinessInputValue {
  businessId: string;
  searchBusinessInputValue: string;
}

interface CommandProfileAccessInputValue {
  profileAccessId: string;
  searchProfileAccessInputValue: string;
}

interface CommandSupplierInputValue {
  supplierId: string;
  searchSupplierInputValue: string;
}

interface CommandTrafficViolationCodeInputValue {
  trafficViolationCodeId: string;
  searchTrafficViolationCodeInputValue: string;
  violationCode?: string;
}

interface CommandUserInputValue {
  userId: string;
  searchUserInputValue: string;
  responsibleUserEmail?: string;
}

interface CommandVehicleInputValue {
  vehicleId: string;
  searchVehicleInputValue: string;
  vehicleLicensePlate?: string;
}

interface CommandBranchInputValue {
  branchId: string;
  searchBranchInputValue: string;
}

interface CommandDriverInputValue {
  driverId: string;
  searchDriverInputValue: string;
  driverCnh?: string;
}

interface CommandFuelTypeInputValue {
  fuelTypeId: string;
  searchFuelTypeInputValue: string;
}

interface CommandVehicleTypeInputValue {
  vehicleTypeId: string;
  searchVehicleTypeInputValue: string;
}

interface CommandPartInputValue {
  partId: string;
  searchPartInputValue: string;
}

interface CommandServiceOrderInputValue {
  serviceOrderId: string;
  searchServiceOrderInputValue: string;
}

interface FuelProps {
  id: string;
  current_mileage: number;
  liters_amount: number;
  price_per_liter: number;
  total_amount: number;
  odometer_photo: string | null;
  odometer_verified: boolean;
  notes?: string | null;
  refueling_date: Date | string;
  businessId: string;
  branchId: string;
  vehicleId: string;
  driverId: string;
  fuelTypeId: string;
  business?: {
    corporate_reason: string;
  };
  branch?: {
    corporate_reason: string;
  };
  vehicle?: {
    description: string;
    license_plate: string;
    brand: string;
    model: string;
  };
  driver?: {
    name: string;
    cnh: string;
  };
  fuelType?: {
    description: string;
  };
  // 📍 GEOLOCATION
  latitude?: number | null;
  longitude?: number | null;
  // AI Verification
  odometer_ai_status?: string;
  odometer_ai_reading?: number | null;
  odometer_ai_details?: any | null;
  odometer_ai_analyzed_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface BusinessProps {
  id: string;
  corporate_reason: string;
  fantasy_name?: string | null;
  cep: string;
  city: string;
  uf: string;
  street: string;
  address_number: string;
  cnpj: string;
  complement?: string | null;
  cnae: string;
  erp_code?: string | null;
  responsible_name: string;
  telephone: string;
  email: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface UseCepValidationProps {
  /** Values to initialize the form (may include persisted values from step navigation) */
  initialData?: Partial<BusinessProps>;
  /** Whether the dialog is open */
  isOpen: boolean;
  /**
   * Original data from database for isDirty calculation.
   * Use this in multi-step forms where initialData may include persisted values.
   * If not provided, initialData is used for isDirty comparison.
   */
  originalData?: Partial<BusinessProps>;
}

interface FieldProps {
  label: string;
  htmlfor: string;
  name: string;
  type: string;
  placeholder: string;
  mask?: string;
  maxLength?: number;
  disabled?: boolean;
  autoComplete?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
}

interface RevalidateDataState {
  revalidateDataError?: string;
}

interface RateLimitConfig {
  maxClicks?: number; // Maximum number of clicks allowed
  timeWindowMs?: number; // Time window in ms to count clicks
  cooldownTimeMs?: number; // Waiting time when limit is exceeded
  storageKey?: string; // Custom key for localStorage
}

export type {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
  CommandSupplierInputValue,
  CommandDriverInputValue,
  CommandFuelTypeInputValue,
  CommandVehicleTypeInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
  CommandPartInputValue,
  CommandServiceOrderInputValue,
  UserRole,
  UserLoggedProps,
  PermissionKey,
  Permission,
  UserPermission,
  CommandBranchInputValue,
  CommandTrafficViolationCodeInputValue,
  FuelProps,
  BusinessProps,
  UseCepValidationProps,
  FieldProps,
  RevalidateDataState,
  RateLimitConfig,
};

export { UserBusinessRole, roleLabels, EnumPermissionKey };
