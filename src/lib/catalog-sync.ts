import type { Query, QueryClient } from "react-query";

/**
 * Keeps every open tab's pickers in step with catalogue edits made elsewhere.
 *
 * The API emits `catalogChanged` in the company's room whenever one of these
 * catalogues is written (`sendCatalogChangedEvent` in its websocket.ts, with
 * this same list of entities). Before, a shipper deactivated by the MASTER
 * stayed selectable in a BUSINESS_ADMIN's "Nova Entrega" until a reload.
 * Atualizar stays the guaranteed manual gesture; this makes it unnecessary in
 * the usual case (decision 2.3).
 */
const CATALOG_CHANGED_EVENT = "catalogChanged";

/**
 * Entity (as the API names it) → roots of the react-query keys that read it.
 *
 * `tests/unitaires/query-key-maps.test.ts` fails when a root here has no
 * `useQuery`/`useInfiniteQuery` behind it, which is how the old revalidate map
 * ended up with nine keys that refreshed nothing.
 */
const CATALOG_QUERY_ROOTS = {
  shipper: ["shipper"],
  occurrence_type: ["occurrence-types-select"],
  status_reason: ["status_change_reason"],
  message_template: ["delivery_message_template"],
  vehicle: ["vehicle", "vehicleData"],
  driver: ["driver"],
  branch: ["branch"],
  supplier: ["supplier"],
  part: ["part"],
  vehicle_type: ["vehicle_type"],
  fuel_type: ["fuel_type"],
  profile_access: ["profile"],
} as const satisfies Record<string, readonly string[]>;

type CatalogEntity = keyof typeof CATALOG_QUERY_ROOTS;

interface CatalogChangedEvent {
  businessId: string;
  entity: CatalogEntity;
}

function isCatalogChangedEvent(value: unknown): value is CatalogChangedEvent {
  if (!value || typeof value !== "object") return false;

  const { businessId, entity } = value as Record<string, unknown>;

  return (
    typeof businessId === "string" &&
    businessId.length > 0 &&
    typeof entity === "string" &&
    Object.prototype.hasOwnProperty.call(CATALOG_QUERY_ROOTS, entity)
  );
}

/**
 * Marks the entity's queries of that company stale and refetches the ones on
 * screen; the rest refetch on their next mount.
 *
 * Scoped by company because a MASTER's tab caches several: an edit in one
 * carrier must not refetch another carrier's lists. Every key of these
 * catalogues carries its `businessId`.
 */
function applyCatalogChange(
  queryClient: QueryClient,
  event: CatalogChangedEvent,
): Promise<void> {
  const roots = new Set<string>(CATALOG_QUERY_ROOTS[event.entity]);

  const matches = (query: Query): boolean => {
    const key = Array.isArray(query.queryKey)
      ? query.queryKey
      : [query.queryKey];

    return (
      typeof key[0] === "string" &&
      roots.has(key[0]) &&
      key.includes(event.businessId)
    );
  };

  return queryClient.invalidateQueries({ predicate: matches });
}

export {
  CATALOG_CHANGED_EVENT,
  CATALOG_QUERY_ROOTS,
  applyCatalogChange,
  isCatalogChangedEvent,
};
export type { CatalogEntity, CatalogChangedEvent };
