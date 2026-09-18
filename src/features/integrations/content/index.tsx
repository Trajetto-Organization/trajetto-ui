"use client";

import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { parseIntegrationTab } from "../lib/tabs";
import { IntegrationsTabs } from "../tabs";
import { IntegrationsPageActions, hasBandActions } from "../page-actions";

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
    <EmptyState icon={Building2} title="Selecione uma empresa" description={sentence} />
  );

  return (
    <div className="my-6 space-y-6">
      {/*
        Company, then what can be done to it, then the sections — the band
        Entregas and Rotas use. The refresh and the create button used to be
        inside each panel, in a row under the strip, which put them between the
        navigation and the list they belong to.

        With no company chosen there is nothing to act on, so the band carries
        the selector alone rather than a row of buttons that would all be
        disabled.
      */}
      <ProtectedPageToolbar
        context={
          mode === "admin" ? (
            <BusinessSelector currentBusinessId={searchParams.businessId} />
          ) : undefined
        }
        actions={
          businessId && hasBandActions(activeTab) ? (
            <IntegrationsPageActions
              activeTab={activeTab}
              businessId={businessId}
            />
          ) : undefined
        }
      >
        <IntegrationsTabs activeTab={activeTab} />
      </ProtectedPageToolbar>

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
