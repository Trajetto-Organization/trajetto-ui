/**
 * Every cache tag the app may ask the server to revalidate.
 *
 * The revalidation server actions used to take whatever list the caller sent.
 * A server action is an endpoint — its id ships in the client bundle — and in
 * Next 14's file-system cache every tag revalidated rewrites the WHOLE tag
 * manifest, which never shrinks. One request carrying a few thousand made-up
 * tags froze the only web replica for tens of seconds and grew the manifest
 * for good, slowing every legitimate revalidation after it.
 *
 * The list is closed: the tags the app's fetches declare and the ones its own
 * code revalidates. (Atualizar no longer sends tags: it refreshes the whole
 * tab through useRevalidateScreen, decision 2.1.) A tag outside it could not
 * be attached to any cached fetch, so refusing it costs nothing.
 * `tests/unitaires/revalidation-tags.test.ts` scans the source and fails when
 * a new tag is used without being added here.
 *
 * The blog and the legal pages have no tag here: their content is MDX in the
 * repository, static at build (decision 10.1). `blog` and `legal` survive
 * only in the leftover Sanity webhook route, dead code pending deletion.
 */
const REVALIDATION_TAGS = [
  "activity-notifications",
  "create-account-payable",
  "create-activity",
  "create-branch",
  "create-business",
  "create-driver",
  "create-fine",
  "create-fuel",
  "create-fuel-type",
  "create-master-user",
  "create-part",
  "create-permission",
  "create-profile-access",
  "create-quote",
  "create-service-order",
  "create-service-order-part",
  "create-supplier",
  "create-user-registration",
  "create-vehicle",
  "create-vehicle-checklist",
  "create-vehicle-type",
  "delete-account-payable",
  "delete-branch",
  "delete-business",
  "delete-driver",
  "delete-fine",
  "delete-fuel",
  "delete-fuel-type",
  "delete-master-user",
  "delete-part",
  "delete-permission",
  "delete-profile-access",
  "delete-quote",
  "delete-service-order",
  "delete-service-order-part",
  "delete-supplier",
  "delete-user-registration",
  "delete-vehicle",
  "delete-vehicle-checklist",
  "delete-vehicle-type",
  "email-notifications",
  "notification-preferences",
  "revoke-master-user",
  "revoke-user-registration",
  "toggle-branch-active",
  "toggle-business-active",
  "update-2fa",
  "update-account-payable",
  "update-activity",
  "update-ai-usage",
  "update-branch",
  "update-branch-count",
  "update-business",
  "update-business-count",
  "update-chat",
  "update-delivery",
  "update-delivery-count",
  "update-driver",
  "update-driver-count",
  "update-entity-count",
  "update-fine",
  "update-fine-count",
  "update-fuel",
  "update-fuel-type",
  "update-import",
  "update-maintenance-costs",
  "update-maintenance-stats",
  "update-master-user",
  "update-notification",
  "update-occurrence-type",
  "update-part",
  "update-part-count",
  "update-permission",
  "update-profile-access",
  "update-quote-status",
  "update-recent-activity",
  "update-route",
  "update-route-count",
  "update-service-order",
  "update-service-order-count",
  "update-service-order-part",
  "update-shipper",
  "update-status-change-reason",
  "update-supplier",
  "update-supplier-count",
  "update-user-count",
  "update-user-registration",
  "update-username",
  "update-vehicle",
  "update-vehicle-by-type",
  "update-vehicle-checklist",
  "update-vehicle-count",
  "update-vehicle-status",
  "update-vehicle-type",
  "whatsapp-settings",
] as const;

type RevalidationTag = (typeof REVALIDATION_TAGS)[number];

/** The largest list any screen sends today is 16 (the overview's counters). */
const MAX_TAGS_PER_CALL = 32;

const ALLOWED = new Set<string>(REVALIDATION_TAGS);

/**
 * The tags to revalidate, or `null` to refuse the call outright.
 *
 * `unknown` because a server action's argument is whatever the request body
 * decodes to, not what the TypeScript signature says. Refusing the whole call
 * on one unknown tag — rather than dropping it — keeps a typo in our own code
 * loud instead of turning it into data that silently never refreshes.
 */
function toAllowedTags(input: unknown): string[] | null {
  const list =
    typeof input === "string" ? [input] : Array.isArray(input) ? input : null;

  if (!list || list.length === 0 || list.length > MAX_TAGS_PER_CALL) {
    return null;
  }

  const tags = new Set<string>();

  for (const tag of list) {
    if (typeof tag !== "string" || !ALLOWED.has(tag)) return null;

    tags.add(tag);
  }

  return [...tags];
}

export { MAX_TAGS_PER_CALL, REVALIDATION_TAGS, toAllowedTags };
export type { RevalidationTag };
