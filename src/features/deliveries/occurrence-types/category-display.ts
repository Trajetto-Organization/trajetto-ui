import {
  OCCURRENCE_CATEGORY_LABELS,
  PAUSE_KIND_LABELS,
  type OccurrenceCategoryKey,
  type PauseKindKey,
} from "./category-rules";
import { readFormFields } from "./form-builder/rules";

/**
 * How the "Tipos de ocorrência" table shows a type's category and what it
 * asks of the driver (decisions 14.3 and 14.4; design §7.1).
 */

const CATEGORY_BADGE: Record<OccurrenceCategoryKey, string> = {
  DELIVERED:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200",
  NOT_DELIVERED:
    "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
  PAUSE:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200",
};

/** A type from an API before the categories reads as "Não entrega". */
function categoryBadgeOf(category: OccurrenceCategoryKey | undefined): {
  label: string;
  className: string;
} {
  const key = category ?? "NOT_DELIVERED";

  return {
    label: OCCURRENCE_CATEGORY_LABELS[key],
    className: CATEGORY_BADGE[key],
  };
}

/** The facet options of the category filter, in the API's order. */
const CATEGORY_FILTER_LABELS: Record<OccurrenceCategoryKey, string> =
  OCCURRENCE_CATEGORY_LABELS;

interface RequirementSource {
  category?: OccurrenceCategoryKey;
  pause_kind?: PauseKindKey | null;
  requires_receipt_photo?: boolean;
  requires_signature?: boolean;
  requires_photo: boolean;
  requires_authorization?: boolean;
  blocks_delivery: boolean;
  form_fields?: unknown;
}

/** The requirements in reading order; a pause shows its legal nature. */
function requirementsOf(type: RequirementSource): string[] {
  if (type.category === "PAUSE") {
    return type.pause_kind
      ? [`Natureza: ${PAUSE_KIND_LABELS[type.pause_kind]}`]
      : [];
  }

  const items: string[] = [];

  if (type.requires_receipt_photo) items.push("Canhoto");
  if (type.requires_signature) items.push("Assinatura");
  if (type.requires_photo) items.push("Fotos");
  if ((readFormFields(type.form_fields)?.length ?? 0) > 0)
    items.push("Formulário");
  if (type.requires_authorization) items.push("Autorização");
  if (type.blocks_delivery) items.push("Impeditiva");

  return items;
}

/** Why "Deletar" is disabled on a default type, or null. */
const DEFAULT_TYPE_DELETE_REASON =
  "Tipo padrão: pode ser editado ou desativado, não excluído.";

function deleteBlockerOf(type: { is_default?: boolean }): string | null {
  return type.is_default ? DEFAULT_TYPE_DELETE_REASON : null;
}

export {
  CATEGORY_FILTER_LABELS,
  DEFAULT_TYPE_DELETE_REASON,
  categoryBadgeOf,
  deleteBlockerOf,
  requirementsOf,
};
