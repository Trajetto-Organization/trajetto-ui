type DeliveryTab =
  | "deliveries"
  | "occurrences"
  | "monitoring"
  | "chat"
  | "shippers"
  | "occurrence-types"
  | "status-change-reasons"
  | "imports"
  | "message-templates"
  | "proof-audits";

const DELIVERY_TABS: Array<{ value: DeliveryTab; label: string }> = [
  { value: "deliveries", label: "Entregas" },
  { value: "occurrences", label: "Ocorrências" },
  { value: "monitoring", label: "Monitoramento" },
  { value: "chat", label: "Chat" },
  { value: "shippers", label: "Embarcadores" },
  { value: "occurrence-types", label: "Tipos de Ocorrência" },
  { value: "status-change-reasons", label: "Motivos de Status" },
  { value: "imports", label: "Importações" },
  { value: "message-templates", label: "Mensagens ao Cliente" },
  { value: "proof-audits", label: "Auditoria de Comprovantes" },
];

/** Anything unknown in the URL falls back to the deliveries table. */
function parseDeliveryTab(value: string | undefined): DeliveryTab {
  return DELIVERY_TABS.some((tab) => tab.value === value)
    ? (value as DeliveryTab)
    : "deliveries";
}

export { DELIVERY_TABS, parseDeliveryTab };
export type { DeliveryTab };
