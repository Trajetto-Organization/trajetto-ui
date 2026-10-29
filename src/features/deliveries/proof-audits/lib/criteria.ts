import type {
  CriterionVerdict,
  ProofAuditSuggestion,
} from "@/actions/delivery/proof-audits";

/**
 * The API's ProofAiState (list-proof-audits/proof-ai-state.ts): what the card
 * says about the automatic reading.
 */
type ProofAiState =
  | "read"
  // Decision 14.2: the phone's provisional hint while the server reads.
  | "device_provisional"
  | "analyzing"
  | "failed"
  | "quota_exceeded"
  | "not_contracted"
  | "unavailable";

/**
 * How the model's reading is put in front of a person.
 *
 * Mirrors the API's criteria in the same order, which is the order they
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
    // Decision 6.9: a selfie, a box label or a blank sheet is the clearest
    // wrong proof there is. Absent on readings from before; the card skips it.
    key: "isReceipt",
    label: "É um canhoto de entrega",
    meaning: "A foto não parece um canhoto: não comprova a entrega.",
  },
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
    label: "O número da NF-e confere",
    meaning: "Canhoto de outra entrega é o erro mais comum aqui.",
  },
  {
    // The date read, as a day, against the day of the proof: the printed
    // emission date is not the receiving date.
    key: "dateVisible",
    label: "A data de recebimento é a da entrega",
    meaning: "Sem a data do dia, o comprovante não prova quando.",
  },
];

const VERDICT_LABELS: Record<CriterionVerdict, string> = {
  yes: "Sim",
  no: "Não",
  unknown: "Não deu para ver",
  not_applicable: "Sem número para conferir",
};

const VERDICT_TONES: Record<CriterionVerdict, string> = {
  yes: "text-emerald-700 dark:text-emerald-400",
  no: "text-red-700 dark:text-red-400",
  unknown: "text-muted-foreground",
  not_applicable: "text-muted-foreground",
};

/** Whether the reading judged the signature (the local OCR does not). */
function signatureAssessed(reading: ProofAuditSuggestion["reading"]): boolean {
  return reading.extracted?.signatureAssessed !== false;
}

/** What the reviewer is told when the reader does not see signatures. */
const SIGNATURE_TO_CHECK =
  "Conferir na foto — a leitura automática não avalia assinatura.";

/**
 * The criteria a reading has answers for: one stored before the receipt
 * question existed has no "é um canhoto" row to show. A signature the
 * reader did not judge is not a tick nor a cross: it goes to
 * `criteriaToCheck` (design P6.2).
 */
function answeredCriteria(
  reading: ProofAuditSuggestion["reading"],
): Array<CriterionRow & { verdict: CriterionVerdict }> {
  return CRITERIA.flatMap((criterion) => {
    if (criterion.key === "hasSignature" && !signatureAssessed(reading))
      return [];

    const verdict = reading[criterion.key];

    return typeof verdict === "string" && verdict in VERDICT_LABELS
      ? [{ ...criterion, verdict: verdict as CriterionVerdict }]
      : [];
  });
}

/** The "para você conferir" group: what the reading left to a person. */
function criteriaToCheck(
  reading: ProofAuditSuggestion["reading"],
): Array<{ key: CriterionRow["key"]; label: string; note: string }> {
  return signatureAssessed(reading)
    ? []
    : [
        {
          key: "hasSignature",
          label: "Tem assinatura",
          note: SIGNATURE_TO_CHECK,
        },
      ];
}

interface ComparisonRow {
  label: string;

  /** What the model read off the photo; null when it could not. */
  read: string | null;

  /** What the delivery expected; null when it has nothing to compare. */
  expected: string | null;
}

/** "2026-09-27" → "27/09/2026", without any clock involved. */
function dayLabel(key: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? "");

  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

/**
 * What was read next to what was expected (decision 6.9): the model
 * transcribes and the code compares, so the reviewer sees both sides and not
 * only a "sim". Empty for readings from before the transcription.
 */
function comparisonRows(
  reading: ProofAuditSuggestion["reading"],
): ComparisonRow[] {
  const { extracted, expected } = reading;
  if (!extracted || !expected) return [];

  return [
    {
      label: "Número da NF-e",
      read: extracted.documentNumber,
      expected: expected.documentNumber,
    },
    {
      label: "Data de recebimento",
      read: dayLabel(extracted.receiptDate) ?? extracted.receiptDateText,
      expected: dayLabel(expected.provenOn),
    },
    {
      label: "Recebedor",
      read: extracted.recipientName,
      expected: expected.recipientName,
    },
    {
      label: "Assinatura",
      read: extracted.digitalSignature
        ? "Coletada na tela do app"
        : extracted.signatureAssessed === false
          ? "Conferir na foto"
          : (VERDICT_LABELS[extracted.signatureOnPaper] ?? null),
      expected: null,
    },
  ];
}

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

/**
 * The badge and the sentence for a card WITHOUT a reading, by why there is
 * none (DLVP-PROOF-4).
 *
 * One "Sem leitura automática" covered a company that did not buy the
 * reading, a reading still running and one that failed, so the reviewer could
 * not tell whether to wait for a suggestion or judge the photo alone.
 */
const AI_STATE_LABELS: Record<Exclude<ProofAiState, "read">, string> = {
  device_provisional: "Pré-checagem do celular",
  analyzing: "Leitura em andamento",
  failed: "Leitura falhou",
  quota_exceeded: "Limite de leituras atingido",
  not_contracted: "Leitura não contratada",
  unavailable: "Sem leitura automática",
};

const AI_STATE_NOTICES: Record<Exclude<ProofAiState, "read">, string> = {
  device_provisional:
    "A leitura automática do servidor ainda está em andamento. Até lá, vale como indício a pré-checagem feita no celular do motorista, abaixo.",
  analyzing:
    "A leitura automática deste comprovante ainda está em andamento. Você pode avaliar a foto agora ou revalidar em instantes para ver a sugestão.",
  failed:
    "A leitura automática não conseguiu analisar esta foto. Avalie a foto diretamente.",
  quota_exceeded:
    "O limite de leituras automáticas do período foi atingido. Avalie a foto diretamente.",
  not_contracted:
    "A leitura automática não está contratada para esta empresa. Avalie a foto diretamente.",
  unavailable: NO_SUGGESTION_NOTICE,
};

const AI_STATE_TONES: Record<Exclude<ProofAiState, "read">, string> = {
  device_provisional:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  analyzing:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  failed:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  quota_exceeded:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  not_contracted: "",
  unavailable: "",
};

const AI_STATES = new Set<ProofAiState>([
  "read",
  "device_provisional",
  "analyzing",
  "failed",
  "quota_exceeded",
  "not_contracted",
  "unavailable",
]);

/**
 * The card's state, read defensively: a card without the field (an API
 * older than this screen) is the generic "sem leitura", never a crash.
 */
function aiStateOf(card: {
  ai_suggestion: unknown;
  aiState?: unknown;
}): ProofAiState {
  if (card.ai_suggestion) return "read";

  return typeof card.aiState === "string" &&
    AI_STATES.has(card.aiState as ProofAiState) &&
    card.aiState !== "read"
    ? (card.aiState as ProofAiState)
    : "unavailable";
}

/** 0.87 → "87%". Null stays null, because "não sei" is not zero. */
function asPercent(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  return `${Math.round(value * 100)}%`;
}

export {
  answeredCriteria,
  criteriaToCheck,
  SIGNATURE_TO_CHECK,
  comparisonRows,
  dayLabel,
  AI_STATE_LABELS,
  AI_STATE_NOTICES,
  AI_STATE_TONES,
  CRITERIA,
  NO_SUGGESTION_NOTICE,
  aiStateOf,
  SUGGESTION_LABELS,
  SUGGESTION_TONES,
  VERDICT_LABELS,
  VERDICT_TONES,
  asPercent,
};
export type { ComparisonRow, CriterionRow, ProofAiState };
