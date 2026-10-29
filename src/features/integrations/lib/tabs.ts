type IntegrationTab = "api-keys" | "webhooks" | "monitor" | "usage";

const INTEGRATION_TABS: Array<{ value: IntegrationTab; label: string }> = [
  { value: "api-keys", label: "Chaves de API" },
  { value: "webhooks", label: "Webhooks" },
  { value: "monitor", label: "Monitor de Envios" },
  { value: "usage", label: "Uso da API" },
];

/** Anything unknown in the URL falls back to the keys. */
function parseIntegrationTab(value: string | undefined): IntegrationTab {
  return INTEGRATION_TABS.some((tab) => tab.value === value)
    ? (value as IntegrationTab)
    : "api-keys";
}

export { INTEGRATION_TABS, parseIntegrationTab };
export type { IntegrationTab };
