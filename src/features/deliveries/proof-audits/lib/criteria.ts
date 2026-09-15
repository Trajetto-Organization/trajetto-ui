import type {
  CriterionVerdict,
  ProofAuditSuggestion,
} from "@/actions/delivery/proof-audits";

/**
 * How the model's reading is put in front of a person.
 *
 * Mirrors the API's four criteria in the same order, which is the order they
 * should be read in: the most damning first. Kept here as data rather than
 * spelled into the component, because "what the card says about a photo" is a
 * product decision and the component is where it would stop being testable.
 */
interface CriterionRow {
  key: keyof ProofAuditSuggestion["reading"];
  label: string;

  /** What a "no" on this criterion actually means for the reviewer. */
  meaning: string;
}

const CRITERIA: CriterionRow[] = [
  {
    key: "legible",
    label: "É um comprovante legível",
    meaning: "Se não é, o resto da leitura não vale nada.",
  },
  {
    key: "hasSignature",
    label: "Tem assinatura",
    meaning: "Um canhoto sem assinatura não comprova recebimento.",
  },
  {
    key: "documentMatches",
    label: "O número do documento confere",
    meaning: "Canhoto de outra entrega é o erro mais comum aqui.",
  },
  {
    key: "dateVisible",
    label: "A data está presente",
    meaning: "Sem data, o comprovante não prova quando.",
  },
];

const VERDICT_LABELS: Record<CriterionVerdict, string> = {
  yes: "Sim",
  no: "Não",
  unknown: "Não deu para ver",
};

const VERDICT_TONES: Record<CriterionVerdict, string> = {
  yes: "text-emerald-700 dark:text-emerald-400",
  no: "text-red-700 dark:text-red-400",
  unknown: "text-muted-foreground",
};

const SUGGESTION_LABELS: Record<
  ProofAuditSuggestion["assessment"]["suggestion"],
  string
> = {
  looks_good: "Parece correto",
  needs_review: "Precisa de um olhar",
  looks_wrong: "Parece ter problema",
};

const SUGGESTION_TONES: Record<
  ProofAuditSuggestion["assessment"]["suggestion"],
  string
> = {
  looks_good: "bg-emerald-100 text-emerald-800 border-emerald-200",
  needs_review: "bg-amber-100 text-amber-800 border-amber-200",
  looks_wrong: "bg-red-100 text-red-800 border-red-200",
};

/**
 * What the card leads with when there is no suggestion at all.
 *
 * A card with no reading is NOT an error state: the company may not have
 * bought the AI, the quota may be spent, the provider may be down. The photo is
 * still there and a person can still decide, which is the entire point of the
 * queue existing independently of the model.
 */
const NO_SUGGESTION_NOTICE =
  "Sem leitura automática para este comprovante. Avalie a foto diretamente.";

/** 0.87 → "87%". Null stays null, because "não sei" is not zero. */
function asPercent(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  return `${Math.round(value * 100)}%`;
}

export {
  CRITERIA,
  NO_SUGGESTION_NOTICE,
  SUGGESTION_LABELS,
  SUGGESTION_TONES,
  VERDICT_LABELS,
  VERDICT_TONES,
  asPercent,
};
export type { CriterionRow };
