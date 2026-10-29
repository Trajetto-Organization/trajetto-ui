import type { BlogCategory } from "@/lib/content/types";

/**
 * Closed list of blog categories. A post's `category` must be one of these
 * keys; an unknown one fails the build instead of creating an orphan filter.
 *
 * `color` / `darkColor` are the design palette (trajetto-content.js), the
 * same values as the `--site-cat-*` tokens in globals.css: the OG images read
 * them here, the pages through the tokens, and both must agree.
 */
export const BLOG_CATEGORIES = {
  entregas: {
    slug: "entregas",
    title: "Gestão de entregas",
    description:
      "Documentos, rotas, comprovantes e ocorrências do dia a dia da entrega.",
    color: "#d81b60",
    darkColor: "#f0558e",
    icon: "delivery",
  },
  frotas: {
    slug: "frotas",
    title: "Gestão de frotas",
    description:
      "Veículos, motoristas, abastecimento, manutenção, multas e custos.",
    color: "#6a3fe0",
    darkColor: "#9b7dff",
    icon: "fleet",
  },
  operacao: {
    slug: "operacao",
    title: "Operação em campo",
    description: "Torre de controle, app do motorista e o que acontece na rua.",
    // teal-700, not 600: 600 is 3.74:1 on the white card.
    color: "#0f766e",
    darkColor: "#2dd4bf",
    icon: "route",
  },
  integracoes: {
    slug: "integracoes",
    title: "Integrações",
    description:
      "API, webhooks, ERP e embarcadores conversando com o Trajetto.",
    color: "#1d4ed8",
    darkColor: "#60a5fa",
    icon: "plug",
  },
  conformidade: {
    slug: "conformidade",
    title: "LGPD e conformidade",
    description:
      "Dados pessoais, legislação de trânsito e jornada do motorista.",
    color: "#b45309",
    darkColor: "#fbbf24",
    icon: "shield",
  },
} as const satisfies Record<string, BlogCategory>;

export type BlogCategorySlug = keyof typeof BLOG_CATEGORIES;
