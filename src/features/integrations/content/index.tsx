"use client";

import { useQuery } from "react-query";

import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { useAuthStore } from "@/store/auth-store";
import { useSessionCompany } from "@/store/session-company";
import { classifyAccessError, type AccessError } from "@/lib/access-error";

import { parseIntegrationTab } from "../lib/tabs";
import { apiKeysQueryKey, fetchApiKeys } from "../lib/queries";

import { IntegrationsTabs } from "../tabs";
import {
  IntegrationsPageActions,
  IntegrationsRefreshAction,
  hasBandActions,
} from "../page-actions";

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
 * Why this company's integrations cannot be shown, or null when they can.
 *
 * Integrations belong to Entregas (decision 4.3, INT-MOD-1): the API refuses
 * them to a company without the module, and the screen says so once instead
 * of four empty panels and a "Nova chave" that could only fail. The session
 * already knows the company's modules on the company's own screen; the API's
 * answer covers the rest (the master's selected company, a profile without
 * `integration_manage`), asked through the keys list — the panel's own cache
 * entry, so it costs no extra request on that tab. The refusal is read by the
 * product's one classifier (decision 4.1), like Entregas and Rotas.
 */
function useIntegrationsAccess(businessId: string | undefined): {
  refusal: AccessError | null;
  isChecking: boolean;
} {
  const enabledModules = useAuthStore((state) => state.enabledModules);
  const role = useAuthStore((state) => state.role);

  const sessionSaysNoModule =
    role !== "MASTER" &&
    Array.isArray(enabledModules) &&
    !enabledModules.includes("DELIVERIES");

  const { data, isLoading } = useQuery(
    apiKeysQueryKey(businessId ?? ""),
    () => fetchApiKeys(businessId ?? ""),
    {
      enabled: Boolean(businessId) && !sessionSaysNoModule,
      refetchOnWindowFocus: false,
    },
  );

  if (sessionSaysNoModule) {
    return {
      refusal: { kind: "module-not-enabled", message: null },
      isChecking: false,
    };
  }

  const refused = data && !data.success && data.status === 403 ? data : null;

  return {
    refusal: refused
      ? classifyAccessError(403, {
          code: refused.code,
          // The API's own sentence travels with its code; a bare 403 (a proxy
          // in front) carries the action's generic fallback, which would
          // misname the refusal, so the state's default copy is used instead.
          message: refused.code ? refused.message : null,
        })
      : null,
    isChecking: Boolean(businessId) && isLoading,
  };
}

/**
 * Four panels, all of them client surfaces with their own fetching.
 *
 * Nothing here is a server-rendered table: issuing a key, editing an endpoint
 * and resending an event all change what the panel is showing, and a page that
 * had to round-trip the server for each would make the monitor — the screen
 * somebody refreshes while a customer waits on the phone — the slowest one.
 */
/** The session's company is not known yet (store/session-company). */
const SessionCompanyLoading = (): JSX.Element => (
  <div className="space-y-4" aria-busy="true" data-session-company-pending>
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

const IntegrationsContent = ({
  mode,
  searchParams,
}: IntegrationsContentProps): JSX.Element => {
  const activeTab = parseIntegrationTab(searchParams.tab);
  const businessId = useIntegrationsBusinessId(mode);
  const session = useSessionCompany();

  // On /dashboard the company is the session's: before the store is seeded
  // the screen is loading, not "choose a company".
  const companyPending = mode === "dashboard" && !businessId && session.pending;

  const { refusal, isChecking } = useIntegrationsAccess(businessId);

  return (
    <div className="my-6 space-y-6">
      {/*
        Company, then what can be done to it, then the sections — the band
        Entregas and Rotas use. With no company chosen the band carries the
        selector alone; a refused company gets Atualizar and nothing that
        writes, rather than a row of buttons that would all fail.
      */}
      <ProtectedPageToolbar
        context={
          mode === "admin" ? (
            <BusinessSelector currentBusinessId={searchParams.businessId} />
          ) : undefined
        }
        actions={
          !businessId || isChecking ? undefined : refusal ? (
            // A refused screen still gets its Atualizar (decision 2.1): once
            // the module is enabled or the profile widened elsewhere, it
            // re-asks the API instead of waiting for a manual reload.
            <IntegrationsRefreshAction activeTab={activeTab} />
          ) : hasBandActions(activeTab) ? (
            <IntegrationsPageActions
              key={businessId}
              activeTab={activeTab}
              businessId={businessId}
              mode={mode}
            />
          ) : undefined
        }
      >
        <IntegrationsTabs activeTab={activeTab} />
      </ProtectedPageToolbar>

      {companyPending ? (
        <SessionCompanyLoading />
      ) : !businessId ? (
        <SelectBusinessEmptyState description="Chaves de API, webhooks e o uso da API são configurados por empresa; escolha a empresa acima." />
      ) : refusal ? (
        /*
          The shared state (decision 4.1): each refusal said as what it is,
          and the master on /admin gets the way to enable Entregas for the
          selected company (decision 4.3) instead of "fale com o suporte".
        */
        <AccessErrorState
          kind={refusal.kind}
          moduleLabel="Entregas"
          audience={mode === "admin" ? "master" : "company"}
          message={refusal.message}
          action={
            refusal.kind === "module-not-enabled" && mode === "admin" ? (
              <ManageModulesButton businessId={businessId} />
            ) : undefined
          }
        />
      ) : isChecking && activeTab !== "api-keys" ? (
        // Marked as loading: the tour waits for the page behind this marker
        // (up to 6 s instead of 1.5 s), and a screen reader hears "busy"
        // instead of a silent placeholder while the access check runs.
        <div className="space-y-3" data-tutorial="loading" aria-busy="true">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : (
        /*
          Keyed by company (decision 2.6, CRIT-19): switching company in the
          master's selector restarts the panel, so the filters, the page, an
          expanded row or a half-filled dialog of company A never carry over
          to company B.
        */
        <div key={businessId}>
          {activeTab === "api-keys" ? (
            <ApiKeysPanel businessId={businessId} />
          ) : activeTab === "webhooks" ? (
            <WebhooksPanel businessId={businessId} />
          ) : activeTab === "monitor" ? (
            <MonitorPanel businessId={businessId} />
          ) : (
            <UsagePanel businessId={businessId} />
          )}
        </div>
      )}
    </div>
  );
};

export { IntegrationsContent };
