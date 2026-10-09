import type {
  TutorialStep,
  TutorialStepVariant,
} from "../tutorial-provider.types";

/**
 * The steps every listing page shares, written once (TUT-13). A page's tour
 * follows the same order: boas-vindas, estatísticas, exportar, revalidar,
 * criar, busca, filtros, tabela, ações da linha, colunas.
 */

const welcomeStep = (title: string, content: string): TutorialStep => ({
  title,
  content,
  placement: "center",
});

const statsStep = (): TutorialStep => ({
  anchor: "data-page-stats",
  title: "Métricas da Página 📊",
  content: `Os cartões resumem a lista inteira desta seção, não só a página carregada:
  • Totais e quantidades por situação
  • Indicadores percentuais quando se aplicam
  DICA: Os números acompanham a busca e os filtros que você aplicar na tabela.`,
  placement: "bottom",
  optional: true,
});

/** The refresh button, named as it reads on screen. */
const revalidateStep = (label = "Atualizar", extra?: string): TutorialStep => ({
  anchor: "revalidate",
  title: `${label} 🔄`,
  content: `O botão ${label} busca de novo tudo o que esta tela mostra, sem recarregar a página inteira.${
    extra ? `\n${extra}` : ""
  }
  NOTA: Para não sobrecarregar o servidor, ele aceita alguns cliques seguidos e depois pede alguns segundos de espera.`,
  placement: "bottom",
});

const searchStep = (
  title: string,
  content: string,
  anchor = "table-search",
): TutorialStep => ({
  anchor,
  title,
  content,
  placement: "bottom",
});

const filtersStep = (anchor: string, content: string): TutorialStep => ({
  anchor,
  title: "Filtros 🎯",
  content: `${content}
  NOTA: Os filtros ficam na URL e se combinam com a busca; o botão Resetar aparece quando algum está ativo.`,
  placement: "bottom",
  optional: true,
});

const tableStep = (title: string, content: string): TutorialStep => ({
  anchor: "data-table",
  title,
  content,
  placement: "top",
  spotlightPadding: 6,
});

/**
 * Fallbacks of the row-menu step (decision 9.1): the ⋮ of the first row when
 * there is one (the engine scrolls the table sideways to reach it), else the
 * empty table — explained, not pointed at a row that does not exist.
 */
const tableActionVariants = (): TutorialStepVariant[] => [
  {
    anchor: "table-empty",
    title: "Ações de cada registro ⚙️",
    content: `A tabela ainda não tem registros, então não há linha para mostrar.
    Quando houver, cada linha terá no fim o menu de três pontos (⋮) com as ações daquele registro, como Editar e Copiar ID.
    DICA: Comece pelo botão de criação no topo da página.`,
  },
  {
    anchor: "table-actions-header",
    title: "Ações de cada registro ⚙️",
    content: `Nesta coluna fica o menu de três pontos (⋮) de cada linha, com as ações daquele registro.
    NOTA: Uma ação que o seu perfil não pode usar aparece desabilitada, e o motivo surge ao passar o mouse.`,
  },
];

const rowActionsStep = (title: string, content: string): TutorialStep => ({
  anchor: "row-actions",
  variants: tableActionVariants(),
  title,
  content,
  placement: "left",
});

const viewOptionsStep = (): TutorialStep => ({
  anchor: "view-options",
  title: "Colunas Visíveis 👁️",
  content: `Escolha quais colunas a tabela mostra e esconda o que não faz parte da sua rotina.
  NOTA: Não exige permissão especial e vale só para o seu navegador.`,
  placement: "left",
  optional: true,
});

const exportStep = (
  entity: string,
  permission: string,
  fields: string[],
): TutorialStep => ({
  anchor: "export-button",
  title: `Exportar ${entity} 📊`,
  content: `Gera um arquivo com ${entity.toLowerCase()} da lista, respeitando a busca e os filtros aplicados. Escolha o formato:
  • CSV: texto separado por vírgulas, abre em qualquer planilha
  • Excel (.xlsx): planilha formatada
  PERMISSÕES NECESSÁRIAS:
  • ESCRITA em ${permission}
  O arquivo traz, entre outros:
  ${fields.map((field) => `• ${field}`).join("\n")}
  IMPORTANTE: O botão fica desabilitado quando não há dados para exportar.`,
  placement: "bottom",
  optional: true,
});

/** The /admin selector: every back-office screen works on one company at a time. */
const businessSelectorStep = (): TutorialStep => ({
  anchor: "business-selector",
  title: "Empresa Selecionada 🏢",
  content: `Tudo nesta tela pertence à empresa escolhida aqui. Troque de empresa a qualquer momento: a tela recomeça do zero, sem levar busca, página ou formulário da empresa anterior.
  NOTA: Sem empresa selecionada, a tela mostra só este seletor e explica o que escolher.`,
  placement: "bottom",
});

/**
 * The MASTER holds every permission, so the "PERMISSÕES NECESSÁRIAS" blocks
 * of a company tour are noise in the back office. Dropped line by line.
 */
function stripPermissionBlocks(content: string): string {
  const lines = content.split("\n");
  const kept: string[] = [];
  let inPermissions = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      /^PERMISSÕES (NECESSÁRIAS|OBRIGATÓRIAS|OPCIONAIS):|^PERMISSÃO NECESSÁRIA:/.test(
        trimmed,
      )
    ) {
      inPermissions = true;
      continue;
    }

    if (inPermissions && /^• (LEITURA|ESCRITA) /.test(trimmed)) continue;

    inPermissions = false;

    if (/^IMPORTANTE: Caso (ainda )?não possua/.test(trimmed)) continue;

    kept.push(line);
  }

  return kept.join("\n");
}

/** A company tour, as the MASTER sees it on /admin: selector first, no permission talk. */
function forBackOffice(
  steps: TutorialStep[],
  withSelector = true,
): TutorialStep[] {
  // Every anchored step is optional here: with no company selected the
  // screen is only the selector, and the tour must not walk through blanks.
  const adapted = steps.map((step) => ({
    ...step,
    optional: step.optional || Boolean(step.anchor || step.variants?.length),
    content: stripPermissionBlocks(step.content),
    variants: step.variants?.map((variant) => ({
      ...variant,
      content: variant.content
        ? stripPermissionBlocks(variant.content)
        : variant.content,
    })),
  }));

  if (!withSelector) return adapted;

  // The selector right after the welcome, before anything that depends on it.
  const [first, ...rest] = adapted;

  return first && !first.anchor
    ? [first, businessSelectorStep(), ...rest]
    : [businessSelectorStep(), ...adapted];
}

export {
  businessSelectorStep,
  exportStep,
  filtersStep,
  forBackOffice,
  revalidateStep,
  rowActionsStep,
  searchStep,
  statsStep,
  stripPermissionBlocks,
  tableActionVariants,
  tableStep,
  viewOptionsStep,
  welcomeStep,
};
