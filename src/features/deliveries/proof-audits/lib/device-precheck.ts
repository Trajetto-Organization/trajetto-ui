/**
 * What the review card says about the driver's phone pre-check (decision
 * 14.2; design ia-local-implementacao §P6.2).
 *
 * The phone reads the receipt offline and says, in booleans only, whether the
 * expected invoice number is on the photo and whether a legible date falls
 * outside the delivery's day. It is a hint from the device — provisional
 * until the server reads the same photo — and never a verdict. Kept as data,
 * like `criteria.ts`, so the wording is tested rather than buried in JSX.
 */

type DeviceAgreement = "AGREE" | "DISAGREE" | "NOT_APPLICABLE";

/** The API's `device_precheck` (shared/ai-precheck/device-precheck.ts). */
interface DevicePrecheck {
  kind: "proof" | "odometer";
  invoice_number_found: boolean | null;
  date_out_of_window: boolean | null;
  typed_mileage_found: boolean | null;
  outcome: "ok" | "warned" | "error";
  driver_overrode: boolean;
}

interface DevicePrecheckView {
  /** One sentence: what the phone found. */
  summary: string;

  /** Extra facts worth a line each (the date, the override). */
  details: string[];

  /** Whether the server's reading has not landed yet. */
  provisional: boolean;

  /** The phone against the server, once both spoke; null otherwise. */
  agreement: string | null;
}

const AGREEMENT_LABELS: Record<DeviceAgreement, string> = {
  AGREE: "A leitura do servidor confirmou a pré-checagem do celular.",
  DISAGREE:
    "A leitura do servidor discorda da pré-checagem do celular. Confira a foto.",
  NOT_APPLICABLE:
    "Não há como comparar a pré-checagem do celular com a leitura do servidor.",
};

const AGREEMENTS = new Set<string>(Object.keys(AGREEMENT_LABELS));

function isPrecheck(value: unknown): value is DevicePrecheck {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<DevicePrecheck>;

  return (
    candidate.kind === "proof" &&
    (candidate.outcome === "ok" ||
      candidate.outcome === "warned" ||
      candidate.outcome === "error")
  );
}

/**
 * The block for a card, or null when there is no receipt pre-check to show.
 *
 * Read defensively: a card from an API older than this screen has neither
 * field, and an odd value is no reason to break the queue.
 */
function devicePrecheckView(card: {
  device_precheck?: unknown;
  deviceAgreement?: unknown;
  aiState?: unknown;
}): DevicePrecheckView | null {
  const precheck = card.device_precheck;

  if (!isPrecheck(precheck)) return null;

  const provisional = card.aiState === "device_provisional";
  const suffix = provisional
    ? " (provisória, aguardando a leitura do servidor)"
    : "";

  let summary: string;

  if (precheck.outcome === "error") {
    summary = "Pré-checagem do celular: o celular não conseguiu ler a foto.";
  } else if (precheck.invoice_number_found === true) {
    summary = `Pré-checagem do celular: NF encontrada na foto${suffix}.`;
  } else if (precheck.invoice_number_found === false) {
    summary = `Pré-checagem do celular: NF não encontrada na foto${suffix}.`;
  } else {
    summary = `Pré-checagem do celular: entrega sem número de NF para conferir${suffix}.`;
  }

  const details: string[] = [];

  if (precheck.outcome !== "error" && precheck.date_out_of_window === true) {
    details.push("A data legível na foto está fora do dia da entrega.");
  }

  if (precheck.driver_overrode) {
    details.push("O motorista foi avisado e enviou mesmo assim.");
  }

  const agreement =
    typeof card.deviceAgreement === "string" &&
    AGREEMENTS.has(card.deviceAgreement)
      ? AGREEMENT_LABELS[card.deviceAgreement as DeviceAgreement]
      : null;

  return { summary, details, provisional, agreement };
}

export { AGREEMENT_LABELS, devicePrecheckView };
export type { DeviceAgreement, DevicePrecheck, DevicePrecheckView };
