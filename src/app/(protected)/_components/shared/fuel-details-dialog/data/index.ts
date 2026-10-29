// AI status colors (shared with table columns)
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
  mismatch: {
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    label: "Divergente",
  },
  fraud: {
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    label: "Suspeita de Fraude",
  },
  unreadable: {
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    label: "Ilegível",
  },
  error: {
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    label: "Erro",
  },
  skipped: {
    color: "bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400",
    label: "Não Analisado",
  },
  // ADR 0010 §5: a "verified" read without a fraud check. Neutral on
  // purpose: the km agrees, nothing more was judged.
  km_matches: {
    color: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
    label: "Km confere",
  },
};

/** What "Km confere" means, when the reading carries no sentence of its own. */
const KM_MATCHES_NOTE =
  "Km lida confere com a informada. A leitura automática não identifica foto de tela ou montagem.";

/**
 * The status the dialog draws: the server's, except a "verified" whose
 * reading did not judge fraud, which is "Km confere" (design P6.2). The API
 * keeps `odometer_ai_status = "verified"`; only the words change.
 */
function fuelDisplayStatus(
  status: string | undefined,
  fraudNotAssessed: boolean,
): string | undefined {
  return status === "verified" && fraudNotAssessed ? "km_matches" : status;
}

export { aiStatusConfig, fuelDisplayStatus, KM_MATCHES_NOTE };
