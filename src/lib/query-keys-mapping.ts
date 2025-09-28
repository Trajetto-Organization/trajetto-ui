type RevalidateDataProps =
  | "update-user-registration"
  | "update-branch"
  | "update-business"
  | "update-part"
  | "update-permission"
  | "update-profile-access"
  | "update-supplier"
  | "update-vehicle-type"
  | "update-fuel-type"
  | "update-driver"
  | "update-vehicle"
  | "update-service-order"
  | "update-service-order-part"
  | "update-account-payable"
  | "update-quote-status"
  | "update-fine"
  | "update-fuel"
  | "update-vehicle-checklist";

const revalidateDataToQueryKeyMap: Record<RevalidateDataProps, string[]> = {
  "update-user-registration": ["user"],
  "update-branch": ["branch"],
  "update-business": ["business"],
  "update-part": ["part"],
  "update-permission": ["permission"],
  "update-profile-access": ["profile"],
  "update-supplier": ["supplier"],
  "update-vehicle-type": ["vehicle_type"],
  "update-fuel-type": ["fuel_type"],
  "update-driver": ["driver"],
  "update-vehicle": ["vehicle"],
  "update-service-order": ["service_order"],
  "update-fine": ["update_fine"],
  "update-fuel": ["update_fuel"],
  "update-vehicle-checklist": ["vehicle_checklist"],
  "update-service-order-part": [],
  "update-account-payable": [],
  "update-quote-status": [],
};

export type { RevalidateDataProps };
export { revalidateDataToQueryKeyMap };
