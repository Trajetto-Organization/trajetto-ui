/**
 * The three cards above a company catalog (Perfis de acesso, Tipos de
 * veículo, Tipos de combustível), shaped from the API's `searchMeta` only
 * (decision 8.8): the server counts the whole search of the company, never
 * the page on screen.
 *
 * Hook-free and icon-free so the rules are testable without rendering; the
 * client component of each screen adds the icons.
 */

type CatalogStatVariant =
  "default" | "primary" | "success" | "warning" | "danger";

interface CatalogStatCard {
  key: string;
  title: string;
  value: string;
  description: string;
  variant: CatalogStatVariant;
}

/** The entry most records point at, as the API sends it. */
interface CatalogLeader {
  id: string;
  label: string;
  count: number;
}

/** Shown when the API's numbers did not come (a failed request, an older API). */
const UNKNOWN = "—";

const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function formatCount(value: number | undefined): string {
  return value === undefined ? UNKNOWN : integer.format(value);
}

/** "1 usuário" / "3 usuários", with the number in pt-BR. */
function plural(count: number, singular: string, pluralForm: string): string {
  return `${integer.format(count)} ${count === 1 ? singular : pluralForm}`;
}

/** Whole-percent share of the base; 0 when there is no base. */
function share(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/**
 * The leader card's line: "3 usuários (60% do total)". The share is of
 * what the search links, so it says how concentrated the catalog is.
 */
function leaderDescription(
  leader: CatalogLeader,
  linked: number,
  noun: { singular: string; plural: string },
): string {
  return `${plural(leader.count, noun.singular, noun.plural)} (${share(leader.count, linked)}% do total)`;
}

/**
 * The first card's line: how many entries nothing points at — the ones that
 * can be deleted or handed out — or that every one is in use.
 */
function unusedDescription(
  total: number,
  unused: number,
  copy: {
    empty: string;
    allUsed: string;
    unusedSingular: string;
    unusedPlural: string;
  },
): string {
  if (total === 0) return copy.empty;
  if (unused === 0) return copy.allUsed;

  return `${integer.format(unused)} ${unused === 1 ? copy.unusedSingular : copy.unusedPlural}`;
}

export {
  UNKNOWN,
  formatCount,
  leaderDescription,
  plural,
  share,
  unusedDescription,
  type CatalogLeader,
  type CatalogStatCard,
  type CatalogStatVariant,
};
