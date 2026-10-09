import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

import { CHECKLIST_CONDITION_LABELS } from "@/features/vehicle-checklist/server-table";

// Field name → Portuguese label
const fieldLabels: Record<string, string> = {
  current_mileage: "Quilometragem",
  tires_condition: "Condição dos Pneus",
  fuel_level_adequate: "Nível de Combustível",
  headlights_working: "Faróis",
  taillights_working: "Lanternas Traseiras",
  turn_signals_working: "Setas",
  bumpers_condition: "Para-choques",
  windshield_condition: "Para-brisa",
  mirrors_condition: "Espelhos",
  seatbelts_working: "Cintos de Segurança",
  dashboard_working: "Painel",
  steering_wheel_condition: "Volante",
  brakes_working: "Freios",
  clutch_working: "Embreagem",
  oil_level_adequate: "Nível de Óleo",
  radiator_water_adequate: "Água do Radiador",
  brake_fluid_adequate: "Fluído de Freio",
  battery_condition: "Bateria",
  spare_tire_condition: "Estepe",
  driver_license_valid: "CNH Válida",
  vehicle_documents_valid: "Documentos do Veículo",
  insurance_valid: "Seguro Válido",
  fire_extinguisher_valid: "Extintor de Incêndio",
  warning_triangle_present: "Triângulo de Sinalização",
  jack_present: "Macaco",
};

// Per-field AI analysis status config
const fieldStatusConfig: Record<
  string,
  { label: string; color: string; Icon: React.ElementType }
> = {
  confirmed: {
    label: "Confirmado",
    color: "bg-green-100 text-green-800 border-green-200",
    Icon: CheckCircle,
  },
  contradicts: {
    label: "Contradiz",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Icon: AlertTriangle,
  },
  inconclusive: {
    label: "Inconclusivo",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    Icon: HelpCircle,
  },
};

// Overall AI status config
const aiStatusConfig: Record<string, { color: string; label: string }> = {
  pending: {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
    label: "Pendente",
  },
  analyzing: {
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 animate-pulse",
    label: "Analisando...",
  },
  verified: {
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    label: "Verificado IA",
  },
  issues_found: {
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    label: "Problemas Encontrados",
  },
  error: {
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    label: "Erro",
  },
  skipped: {
    color: "bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400",
    label: "Não Analisado",
  },
  // ADR 0010 §5: a "verified" whose km was read without a fraud check.
  km_matches: {
    color: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
    label: "Km confere",
  },
  // No photo of a kind the reader covers: nothing failed, there is simply
  // no automatic reading. Neutral, no error icon (design P6.2).
  not_covered: {
    color: "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300",
    label: "Sem leitura automática",
  },
};

/** The sentence under "Sem leitura automática" (design P6.2). */
const NOT_COVERED_NOTE = "Sem leitura automática — confira a foto.";

/**
 * The fields the automatic reader reads (ADR 0010 §5: only the odometer).
 * Fuel level, tyres and "working" items are never read automatically.
 */
const READER_COVERED_FIELDS = ["current_mileage"];

function parsedObject(value: unknown): Record<string, unknown> | null {
  let parsed: unknown = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }

  return parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>)
    : null;
}

/**
 * The status the dialog draws: the server's, except
 * - a "verified" with any field read without a fraud check: "Km confere";
 * - a "skipped" checklist with no photo the reader covers: "Sem leitura
 *   automática", rather than a "não analisado" that suggests something
 *   went wrong.
 * The API contract does not change.
 */
function checklistDisplayStatus(
  status: string | undefined,
  context: {
    /** Stored ai_verification_details (field → outcome), or a JSON string. */
    details?: unknown;
    /** The live completed event said a field was read without a fraud check. */
    liveFraudUnassessed?: boolean;
    /** The checklist's photos_by_field (field → storage keys). */
    photosByField?: unknown;
  },
): string | undefined {
  if (status === "verified") {
    const stored = Object.values(parsedObject(context.details) ?? {}).some(
      (outcome) =>
        Boolean(outcome) &&
        typeof outcome === "object" &&
        (outcome as { fraudAssessed?: unknown }).fraudAssessed === false,
    );

    return context.liveFraudUnassessed || stored ? "km_matches" : status;
  }

  if (status === "skipped") {
    // Without the photos (an older row or API) nothing can be said.
    const photos = parsedObject(context.photosByField);

    if (!photos) return status;

    const covered = READER_COVERED_FIELDS.some((field) => {
      const keys = photos[field];
      return Array.isArray(keys) && keys.length > 0;
    });

    return covered ? status : "not_covered";
  }

  return status;
}

// Overall condition config
const overallConditionConfig: Record<string, { label: string; color: string }> =
  {
    approved: {
      label: CHECKLIST_CONDITION_LABELS.approved,
      color: "bg-green-100 text-green-800",
    },
    approved_with_restrictions: {
      label: CHECKLIST_CONDITION_LABELS.approved_with_restrictions,
      color: "bg-yellow-100 text-yellow-800",
    },
    rejected: {
      label: CHECKLIST_CONDITION_LABELS.rejected,
      color: "bg-red-100 text-red-800",
    },
  };

export {
  checklistDisplayStatus,
  NOT_COVERED_NOTE,
  fieldLabels,
  aiStatusConfig,
  overallConditionConfig,
  fieldStatusConfig,
};
