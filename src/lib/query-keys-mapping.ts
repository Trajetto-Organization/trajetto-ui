/**
 * The names a page gives its data (the server cache tags of its listing).
 */
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
  | "update-route"
  | "update-chat"
  | "update-shipper"
  | "update-occurrence-type"
  | "update-status-change-reason"
  | "update-import"
  | "toggle-business-active"
  | "toggle-branch-active";

/**
 * Roots of the react-query keys a write leaves stale in the tab that made it,
 * for a mutation that refreshes them right away.
 *
 * Only what is read is kept. It used to scope "Atualizar" per page and
 * was wrong twice over — the Entregas tab pointed at `["delivery"]`, a key no
 * query has, and 9 of 29 entries named keys that did not exist. Atualizar now
 * refreshes the whole tab (useRevalidateScreen) and the catalogues follow
 * `catalogChanged` (catalog-sync), so the only reader left is the import
 * reversal. `tests/unitaires/query-key-maps.test.ts` fails when a root here
 * has no `useQuery`/`useInfiniteQuery` behind it.
 */
const revalidateDataToQueryKeyMap = {
  // An import (and its reversal) creates or removes deliveries and routes.
  "update-import": ["delivery-detail", "route-detail", "unrouted-deliveries"],
} as const satisfies Partial<Record<RevalidateDataProps, readonly string[]>>;

export type { RevalidateDataProps };
export { revalidateDataToQueryKeyMap };
