"use client";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";

import { parseIntegrationTab } from "../lib/tabs";
import { IntegrationsTabs } from "../tabs";

import { ApiKeysPanel } from "../api-keys/panel";
import { WebhooksPanel } from "../webhooks/panel";
import { MonitorPanel } from "../monitor/panel";
import { UsagePanel } from "../usage/panel";

import { useIntegrationsBusinessId } from "../hooks/use-integrations-business-id";

interface IntegrationsContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  searchParams: { tab?: string; businessId?: string };
}

/**
 * Three panels, all of them client surfaces with their own fetching.
 *
 * Nothing here is a server-rendered table: issuing a key, editing an endpoint
 * and resending an event all change what the panel is showing, and a page that
 * had to round-trip the server for each would make the monitor — the screen
 * somebody refreshes while a customer waits on the phone — the slowest one.
 */
const IntegrationsContent = ({
  mode,
  searchParams,
}: IntegrationsContentProps): JSX.Element => {
  const activeTab = parseIntegrationTab(searchParams.tab);
  const businessId = useIntegrationsBusinessId();

  const renderNeedsBusiness = (sentence: string) => (
    <div
      className="flex h-72 items-center justify-center rounded-lg
      border-2 border-dashed"
    >
      <p className="text-center text-sm text-muted-foreground">{sentence}</p>
    </div>
  );

  return (
    <div className="space-y-4 my-6">
      <div className="space-y-4">
        {mode === "admin" && (
          <BusinessSelector currentBusinessId={searchParams.businessId} />
        )}

        <IntegrationsTabs activeTab={activeTab} />
      </div>

      {!businessId ? (
        renderNeedsBusiness(
          "Selecione uma empresa para gerenciar as integrações",
        )
      ) : activeTab === "api-keys" ? (
        <ApiKeysPanel businessId={businessId} />
      ) : activeTab === "webhooks" ? (
        <WebhooksPanel businessId={businessId} />
      ) : activeTab === "monitor" ? (
        <MonitorPanel businessId={businessId} />
      ) : (
        <UsagePanel businessId={businessId} />
      )}
    </div>
  );
};

export { IntegrationsContent };
