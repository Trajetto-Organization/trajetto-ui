import type {
  CatalogueTopic,
  IntegrationCatalogue,
} from "@/actions/integration";

/**
 * What a webhook subscription covers, matched exactly as the API's
 * dispatcher matches it (trajetto-api src/shared/integration/webhook-catalogue.ts).
 *
 * A wildcard is a topic PREFIX: `delivery.*` covers `delivery.created`. A
 * family is not a prefix — the document family spans `delivery.*`,
 * `occurrence.*` and `proof.*` — so "Todos os eventos" of Documentos is those
 * three. The form used to save `document.*`, which covers no topic at all:
 * the endpoint received nothing, and the boxes on screen showed unchecked
 * because they looked for `delivery.*` (DLVB-22, decision 5.9).
 */
type TopicFamily = CatalogueTopic["family"];

/** Old spellings the API still delivers to but no longer accepts on save. */
const LEGACY_WILDCARD_ALIASES: Record<string, string[]> = {
  "document.*": ["delivery.*", "occurrence.*", "proof.*"],
};

/** `delivery.created` → `delivery.*`. */
const wildcardOf = (topic: string): string => `${topic.split(".")[0]}.*`;

/**
 * The wildcards "Todos os eventos" of a family subscribes to: the catalogue's
 * own answer when it gives one, otherwise the prefixes of the family's topics
 * — the same derivation the API makes.
 */
function familyWildcards(
  family: TopicFamily,
  entries: ReadonlyArray<Pick<CatalogueTopic, "topic">>,
  catalogue?: Pick<IntegrationCatalogue, "families"> | null,
): string[] {
  const declared = catalogue?.families?.find(
    (entry) => entry.family === family,
  );

  if (declared && declared.wildcards.length > 0) return [...declared.wildcards];

  return [...new Set(entries.map((entry) => wildcardOf(entry.topic)))];
}

function subscriptionMatches(subscription: string, topic: string): boolean {
  if (subscription === topic) return true;

  const alias = LEGACY_WILDCARD_ALIASES[subscription];

  if (alias)
    return alias.some((wildcard) => subscriptionMatches(wildcard, topic));

  if (!subscription.endsWith(".*") || subscription === ".*") return false;

  return topic.startsWith(subscription.slice(0, -1));
}

/** Whether the endpoint receives this topic, by name or by a wildcard. */
const isCovered = (topics: readonly string[], topic: string): boolean =>
  topics.some((subscription) => subscriptionMatches(subscription, topic));

/**
 * Covered by a wildcard rather than by its own name: shown checked and
 * locked, because unchecking one cannot mean anything while the wildcard
 * subscribes to all of them.
 */
const isCoveredByWildcard = (
  topics: readonly string[],
  topic: string,
): boolean =>
  topics.some(
    (subscription) =>
      subscription !== topic && subscriptionMatches(subscription, topic),
  );

const isFamilySelected = (
  topics: readonly string[],
  wildcards: readonly string[],
): boolean =>
  wildcards.length > 0 &&
  wildcards.every((wildcard) => topics.includes(wildcard));

/**
 * Turning a whole family on, and off again.
 *
 * On: the family's wildcards replace its individual topics — `["route.*",
 * "route.started"]` says nothing the first entry does not, and reads as two
 * subscriptions. The wildcards are real subscriptions, matched against topics
 * that do not exist yet; expanding them into today's names would freeze the
 * subscription. Off: the wildcards go, and what was chosen by name elsewhere
 * stays.
 */
function toggleFamily(
  topics: readonly string[],
  wildcards: readonly string[],
  familyTopics: readonly string[],
): string[] {
  if (isFamilySelected(topics, wildcards)) {
    return topics.filter((topic) => !wildcards.includes(topic));
  }

  const replaced = new Set([...wildcards, ...familyTopics]);

  return [...topics.filter((topic) => !replaced.has(topic)), ...wildcards];
}

/**
 * The family's wildcards the endpoint holds WITHOUT holding all of them —
 * only `delivery.*` of Documentos, say. A valid subscription (the public
 * reference lists each prefix), but "Todos os eventos" reads off and the
 * topics it covers are locked, so without its own entry on screen the
 * wildcard could not be removed from the form at all.
 */
function partialWildcards(
  topics: readonly string[],
  wildcards: readonly string[],
): string[] {
  if (isFamilySelected(topics, wildcards)) return [];

  return wildcards.filter((wildcard) => topics.includes(wildcard));
}

/**
 * Stored subscriptions the catalogue does not know: a topic retired since, or
 * a wildcard the API no longer accepts. They matched nothing on screen, so
 * they were invisible — and the save then failed on them with a toast.
 */
function unknownSubscriptions(
  topics: readonly string[],
  knownTopics: readonly string[],
  knownWildcards: readonly string[],
): string[] {
  const known = new Set([...knownTopics, ...knownWildcards]);

  return topics.filter((topic) => !known.has(topic));
}

const removeSubscription = (
  topics: readonly string[],
  subscription: string,
): string[] => topics.filter((topic) => topic !== subscription);

/**
 * What an endpoint loaded from the API is subscribed to, in the spelling the
 * API accepts today: a legacy `document.*` becomes the three wildcards, so an
 * edit can be saved.
 */
function normalizeSubscriptions(topics: readonly string[]): string[] {
  const expanded = topics.flatMap(
    (topic) => LEGACY_WILDCARD_ALIASES[topic] ?? [topic],
  );

  return [...new Set(expanded)];
}

/** Same subscriptions, whatever the order: the dirty check of the edit form. */
function sameSubscriptions(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const a = [...new Set(normalizeSubscriptions(left))].sort();
  const b = [...new Set(normalizeSubscriptions(right))].sort();

  return a.length === b.length && a.every((topic, index) => topic === b[index]);
}

export {
  familyWildcards,
  isCovered,
  isCoveredByWildcard,
  isFamilySelected,
  normalizeSubscriptions,
  partialWildcards,
  removeSubscription,
  sameSubscriptions,
  subscriptionMatches,
  toggleFamily,
  unknownSubscriptions,
  wildcardOf,
};
export type { TopicFamily };
