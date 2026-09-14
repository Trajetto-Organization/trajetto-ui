type RevalidateDataProps =
  | "update-user-registration"
  | "update-master-user"
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
  | "update-vehicle-checklist"
  | "update-activity"
  | "update-delivery"
  | "update-chat"
  | "update-shipper"
  | "update-occurrence-type"
  | "toggle-business-active"
  | "toggle-branch-active";

const revalidateDataToQueryKeyMap: Record<RevalidateDataProps, string[]> = {
  "update-user-registration": ["user"],
  "update-master-user": ["master_user"],
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
  "update-activity": ["activity"],
  "update-delivery": ["delivery"],

  /**
   * The chat has no server cache to revalidate: it is a live client surface
   * fed by react-query and a socket, so its whole refresh IS this list of
   * keys. `chat-threads` covers the conversations and — its badge riding the
   * same prefix — the unread counter; `chat-conversation` is what the open
   * pane listens on to reload the messages it is showing.
   *
   * It used to point at `update-delivery`, a Next cache tag the chat never
   * reads, which made the button on that tab decoration.
   */
  "update-chat": ["chat-threads", "chat-search", "chat-conversation"],

  "update-shipper": ["shipper"],
  "update-occurrence-type": ["occurrence_type"],
  "toggle-business-active": ["business"],
  "toggle-branch-active": ["branch"],
  "update-service-order-part": [],
  "update-account-payable": [],
  "update-quote-status": [],
};

export type { RevalidateDataProps };
export { revalidateDataToQueryKeyMap };
