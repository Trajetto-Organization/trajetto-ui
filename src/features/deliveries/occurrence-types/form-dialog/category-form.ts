import {
  OCCURRENCE_CATEGORY_LABELS,
  PAUSE_KIND_LABELS,
  categoryIssues,
  type CategoryIssue,
  type OccurrenceCategoryKey,
  type PauseKindKey,
} from "../category-rules";

/**
 * What the type dialog shows and sends per category (decisions 14.3 and
 * 14.4; design §7.2). Pure, so the matrix the screen follows is tested
 * without rendering: a switch the category cannot have is neither shown nor
 * sent as "on".
 */

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: OccurrenceCategoryKey;
  label: string;
  hint: string;
}> = [
  {
    value: "DELIVERED",
    label: OCCURRENCE_CATEGORY_LABELS.DELIVERED,
    hint: "Registrar comprova a entrega, com as exigências do tipo.",
  },
  {
    value: "NOT_DELIVERED",
    label: OCCURRENCE_CATEGORY_LABELS.NOT_DELIVERED,
    hint: "Um problema na entrega, impeditivo ou informativo.",
  },
  {
    value: "PAUSE",
    label: OCCURRENCE_CATEGORY_LABELS.PAUSE,
    hint: "Um motivo de pausa da jornada do motorista.",
  },
];

const PAUSE_KIND_OPTIONS: ReadonlyArray<{
  value: PauseKindKey;
  label: string;
}> = [
  { value: "MEAL", label: PAUSE_KIND_LABELS.MEAL },
  { value: "REST", label: PAUSE_KIND_LABELS.REST },
  { value: "OTHER", label: PAUSE_KIND_LABELS.OTHER },
];

const PAUSE_KIND_HELP =
  'Só "Refeição" conta como intervalo de refeição da Lei 13.103. Lanche e café: escolha Descanso ou Outra.';

const CATEGORY_LOCKED_HELP =
  "A categoria não muda depois que o tipo foi usado.";

const DEFAULT_TYPE_LOCKED_HELP =
  "Tipo padrão: a categoria e a natureza não mudam. Ele pode ser renomeado, editado ou desativado.";

const RECEIPT_AI_NOTE = "Validado por IA quando a empresa tem o módulo de IA.";

const RECEIPT_NO_AI_WARNING =
  "Sua empresa não tem o módulo de IA: o canhoto vai só para a auditoria humana.";

const LEGACY_APP_NOTICE =
  "Aplicativos anteriores aos tipos de entrega registram as entregas com este tipo. Se você exigir assinatura, fotos ou formulário, esses aparelhos precisarão ser atualizados para comprovar.";

/** The switches and blocks the dialog renders for a category. */
interface CategorySections {
  receiptPhoto: boolean;
  signature: boolean;
  photos: boolean;
  blocking: boolean;
  authorization: boolean;
  form: boolean;
  pauseKind: boolean;
}

function sectionsFor(category: OccurrenceCategoryKey): CategorySections {
  if (category === "PAUSE") {
    return {
      receiptPhoto: false,
      signature: false,
      photos: false,
      blocking: false,
      authorization: false,
      form: false,
      pauseKind: true,
    };
  }

  return {
    receiptPhoto: true,
    signature: true,
    photos: true,
    blocking: category === "NOT_DELIVERED",
    authorization: true,
    form: true,
    pauseKind: false,
  };
}

/** Every switch the dialog may send; unchecked or hidden ones go as "false". */
const CATEGORY_TOGGLES = [
  "requires_photo",
  "requires_receipt_photo",
  "requires_signature",
  "blocks_delivery",
  "requires_authorization",
] as const;

type CategoryToggle = (typeof CATEGORY_TOGGLES)[number];

const TOGGLE_SECTION: Record<CategoryToggle, keyof CategorySections> = {
  requires_photo: "photos",
  requires_receipt_photo: "receiptPhoto",
  requires_signature: "signature",
  blocks_delivery: "blocking",
  requires_authorization: "authorization",
};

/**
 * The switch values to send: what is checked, and "false" for what is off or
 * hidden — a hidden switch keeps its DOM state, and a pause sent with a stale
 * "Exigir foto" on would be refused by the API's matrix.
 */
function toggleValues(
  category: OccurrenceCategoryKey,
  checked: (toggle: CategoryToggle) => boolean,
): Record<CategoryToggle, "true" | "false"> {
  const sections = sectionsFor(category);

  return Object.fromEntries(
    CATEGORY_TOGGLES.map((toggle) => [
      toggle,
      sections[TOGGLE_SECTION[toggle]] && checked(toggle) ? "true" : "false",
    ]),
  ) as Record<CategoryToggle, "true" | "false">;
}

/** Why the category (and the nature) cannot change on this type, or null. */
function categoryLockReason(
  type: { is_default?: boolean; in_use?: boolean } | null,
): string | null {
  if (!type) return null;
  if (type.is_default) return DEFAULT_TYPE_LOCKED_HELP;

  return type.in_use ? CATEGORY_LOCKED_HELP : null;
}

/** The matrix's refusals for what the dialog is about to send. */
function dialogIssues(input: {
  category: OccurrenceCategoryKey;
  pauseKind: PauseKindKey | null;
  toggles: Record<CategoryToggle, "true" | "false">;
  hasForm: boolean;
}): CategoryIssue[] {
  return categoryIssues({
    category: input.category,
    requires_photo: input.toggles.requires_photo === "true",
    requires_receipt_photo: input.toggles.requires_receipt_photo === "true",
    requires_signature: input.toggles.requires_signature === "true",
    requires_authorization: input.toggles.requires_authorization === "true",
    blocks_delivery: input.toggles.blocks_delivery === "true",
    pause_kind: input.category === "PAUSE" ? input.pauseKind : null,
    has_form: input.category !== "PAUSE" && input.hasForm,
  });
}

/**
 * Whether "Exigir foto do canhoto" starts on. The stored value while the
 * category is the stored one; otherwise what the category asks by default —
 * on for Entrega, as "Entrega normal" — so switching the category of a new
 * type to Entrega does not leave a delivery type without its receipt.
 */
function receiptPhotoDefault(
  type: {
    category?: OccurrenceCategoryKey;
    requires_receipt_photo?: boolean;
  } | null,
  category: OccurrenceCategoryKey,
): boolean {
  if (type && (type.category ?? "NOT_DELIVERED") === category) {
    return type.requires_receipt_photo === true;
  }

  return category === "DELIVERED";
}

/**
 * The warning under the receipt switch when the company has no AI quota
 * (design §7.2), or null. Unknown (the usage could not be read) says nothing:
 * a wrong warning is worse than none.
 */
function receiptAiWarning(
  aiAnalysisLimit: number | null | undefined,
): string | null {
  return aiAnalysisLimit === 0 ? RECEIPT_NO_AI_WARNING : null;
}

/** The default delivery type: the installed app proves with it. */
function showsLegacyAppNotice(
  type: { is_default?: boolean; category?: OccurrenceCategoryKey } | null,
): boolean {
  return Boolean(type?.is_default && type.category === "DELIVERED");
}

export {
  CATEGORY_LOCKED_HELP,
  CATEGORY_OPTIONS,
  CATEGORY_TOGGLES,
  DEFAULT_TYPE_LOCKED_HELP,
  LEGACY_APP_NOTICE,
  PAUSE_KIND_HELP,
  PAUSE_KIND_OPTIONS,
  RECEIPT_AI_NOTE,
  RECEIPT_NO_AI_WARNING,
  categoryLockReason,
  dialogIssues,
  receiptAiWarning,
  receiptPhotoDefault,
  sectionsFor,
  showsLegacyAppNotice,
  toggleValues,
};
export type { CategorySections, CategoryToggle };
