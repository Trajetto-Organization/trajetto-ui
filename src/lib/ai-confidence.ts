/**
 * The model's confidence as a percentage, from whatever a record stored
 * (AI-3). Pure, and tested.
 *
 * Three scales used to live side by side: the odometer's 0–100 (shown ×100,
 * "8500%"), the checklist's 0–100 (guessed with `> 1 ? x : x * 100`) and the
 * receipt's 0–1. The API now stores 0–1 everywhere; records written before
 * still hold 0–100, and this is the one place that tells them apart.
 */
function confidencePercent(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  const percent = value > 1 ? value : value * 100;

  return Math.min(100, Math.round(percent));
}

/**
 * What the screen reads off Fuel.odometer_ai_details: the normalized result
 * (`confidence`, `observation`) or, for a record from before, the model's own
 * keys (`confianca`, `observacao`).
 */
function odometerDetails(details: unknown): {
  confidence: number | null;
  observation: string | null;
} {
  let parsed: unknown = details;

  if (typeof details === "string") {
    try {
      parsed = JSON.parse(details);
    } catch {
      parsed = null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return { confidence: null, observation: null };
  }

  const record = parsed as Record<string, unknown>;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  return {
    confidence: confidencePercent(record.confidence ?? record.confianca),
    observation:
      text(record.details) ??
      text(record.observation) ??
      text(record.observacao),
  };
}

/**
 * Whether a stored odometer reading was made without a fraud check (ADR 0010
 * §5): the local OCR reader cannot tell a photo of a screen from a
 * dashboard, so its "verified" only means the km agrees. The API writes
 * `fraudAssessed: false` only then; absent means judged, as before.
 */
function fraudUnassessed(details: unknown): boolean {
  let parsed: unknown = details;

  if (typeof details === "string") {
    try {
      parsed = JSON.parse(details);
    } catch {
      return false;
    }
  }

  return (
    Boolean(parsed) &&
    typeof parsed === "object" &&
    (parsed as { fraudAssessed?: unknown }).fraudAssessed === false
  );
}

const READING_LABELS: Record<string, string> = {
  good: "Bom",
  needs_attention: "Requer atenção",
  bad: "Ruim",
  nao_sei: "Não deu para ver",
  cheio: "Cheio",
  tres_quartos: "3/4",
  metade: "Metade",
  um_quarto: "1/4",
  reserva: "Reserva",
  ilegivel: "Ilegível",
  sim: "Sim",
  nao: "Não",
};

/**
 * A checklist value — what the driver informed or what the model saw — in
 * words: "Ruim", "Reserva", "150.233 km", "Sim". Null when there is nothing
 * to say (a result from before the readings were stored).
 */
function readingLabel(value: unknown, unit?: "km"): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "boolean") return value ? "Sim" : "Não";

  if (typeof value === "number") {
    const number = value.toLocaleString("pt-BR");
    return unit ? `${number} ${unit}` : number;
  }

  if (typeof value === "string") return READING_LABELS[value] ?? value;

  return null;
}

export { confidencePercent, fraudUnassessed, odometerDetails, readingLabel };
