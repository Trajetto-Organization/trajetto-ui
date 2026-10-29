import {
  Package,
  Plug,
  Route,
  ShieldCheck,
  Truck,
  type LucideProps,
} from "lucide-react";

import type { BlogCategoryIcon } from "@/lib/content/types";

/**
 * A blog category's accent as the CSS variable `--acc` (an "r g b" triplet,
 * so `rgb(var(--acc) / .1)` works). The values are the site-cat-* tokens of
 * the redesign, one per theme, instead of the hexes in categories.ts: the
 * design re-tuned the palette (frotas violet, integrações blue) and the
 * tokens switch with the theme without a second class.
 */
const CATEGORY_ACCENT: Record<string, string> = {
  entregas: "[--acc:var(--site-cat-entregas)]",
  frotas: "[--acc:var(--site-cat-frotas)]",
  operacao: "[--acc:var(--site-cat-operacao)]",
  integracoes: "[--acc:var(--site-cat-integracoes)]",
  conformidade: "[--acc:var(--site-cat-conformidade)]",
};

function categoryAccent(slug: string): string {
  return CATEGORY_ACCENT[slug] ?? CATEGORY_ACCENT.entregas;
}

/** Background dot of a category, for filter chips that sit outside any `--acc` scope. */
const CATEGORY_DOT: Record<string, string> = {
  entregas: "bg-site-cat-entregas",
  frotas: "bg-site-cat-frotas",
  operacao: "bg-site-cat-operacao",
  integracoes: "bg-site-cat-integracoes",
  conformidade: "bg-site-cat-conformidade",
};

function categoryDot(slug: string): string {
  return CATEGORY_DOT[slug] ?? CATEGORY_DOT.entregas;
}

// The design's icon per category (trajetto-content.js), all lucide.
const ICONS: Record<BlogCategoryIcon, typeof Truck> = {
  delivery: Package,
  fleet: Truck,
  route: Route,
  plug: Plug,
  shield: ShieldCheck,
};

/** The blog has no cover images: the category's icon is the art. */
const CategoryIcon = ({
  icon,
  ...props
}: { icon: BlogCategoryIcon } & LucideProps) => {
  const Icon = ICONS[icon] ?? Package;

  return <Icon aria-hidden {...props} />;
};

export { CategoryIcon, categoryAccent, categoryDot };
