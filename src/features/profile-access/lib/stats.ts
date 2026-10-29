import {
  UNKNOWN,
  formatCount,
  leaderDescription,
  unusedDescription,
  type CatalogStatCard,
} from "@/lib/catalog-stats";

import type { ProfileAccessListSearchMeta } from "../types";

/**
 * Perfis de acesso: how many profiles, how many people hold them (and how
 * many profiles nobody holds), and the profile most people hold — what an
 * admin checks before creating one more profile or cleaning up (decision
 * 16.350). `pagerTotal` is undefined when the request failed.
 */
function profileAccessStatCards(
  searchMeta: ProfileAccessListSearchMeta | undefined,
  pagerTotal: number | undefined,
): CatalogStatCard[] {
  const total = searchMeta?.total ?? pagerTotal;

  return [
    {
      key: "profiles",
      title: "Perfis de acesso",
      value: formatCount(total),
      description: searchMeta
        ? unusedDescription(searchMeta.total, searchMeta.withoutUsers, {
            empty: "Nenhum perfil cadastrado",
            allUsed: "Todos com usuários vinculados",
            unusedSingular: "sem usuários vinculados",
            unusedPlural: "sem usuários vinculados",
          })
        : "Na busca atual",
      variant: "primary",
    },
    {
      key: "linked-users",
      title: "Usuários vinculados",
      value: formatCount(searchMeta?.linkedUsers),
      description: "Pessoas com um destes perfis",
      variant: "success",
    },
    {
      key: "most-used",
      title: "Perfil mais usado",
      value: searchMeta?.mostUsed?.label ?? UNKNOWN,
      description: !searchMeta
        ? "O perfil com mais usuários"
        : searchMeta.mostUsed
          ? leaderDescription(searchMeta.mostUsed, searchMeta.linkedUsers, {
              singular: "usuário",
              plural: "usuários",
            })
          : "Nenhum perfil em uso ainda",
      variant: "default",
    },
  ];
}

export { profileAccessStatCards };
