"use client";

import { useState } from "react";
import { useIsFetching, useQueryClient } from "react-query";

import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { RefreshButton } from "@/components/shared/custom/refresh-button";
import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { INTEGRATION_DOCS } from "../lib/docs-links";
import type { IntegrationTab } from "../lib/tabs";
import type { IntegrationsMode } from "../lib/api-key-limits";

import { ApiKeyDialog } from "../api-keys/create-dialog";
import { WebhookFormDialog } from "../webhooks/form-dialog";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

/**
 * What can be done to the company's integrations, in the page's top band.
 *
 * These buttons used to live INSIDE each panel, in a row of their own under
 * the section strip — so "Atualizar" and "Nova chave" sat between the
 * navigation and the list, reading as the list's rather than the section's.
 * Entregas moved the same buttons up beside the company selector; this is that
 * same band, for the same reason.
 */
interface IntegrationsPageActionsProps {
  activeTab: IntegrationTab;
  businessId: string;

  /** The master's screen or the company's: the key dialog's ceiling. */
  mode: IntegrationsMode;
}

/**
 * The cache key each tab reads, by prefix: the spinner follows the open
 * tab's own request, and a create refetches the list it added to.
 */
const QUERY_KEY: Record<IntegrationTab, string> = {
  "api-keys": "integration_api_keys",
  webhooks: "integration_webhook_endpoints",
  monitor: "integration_webhook_deliveries",
  usage: "integration_api_usage",
};

/** Per tab, so a cooldown on Webhooks does not lock Chaves de API. */
const RATE_LIMIT_KEY: Record<IntegrationTab, string> = {
  "api-keys": "integrations-api-keys",
  webhooks: "integrations-webhooks",
  monitor: "integrations-monitor",
  usage: "integrations-usage",
};

/**
 * The two tabs whose actions belong in the page's band.
 *
 * Monitor de Envios and Uso da API are deliberately absent, and it is the same
 * rule Entregas applies to Auditoria de Comprovantes: a tab whose only action
 * is the refresh keeps it beside the numbers that refresh changes.
 */
const CREATE_LABEL: Partial<Record<IntegrationTab, string>> = {
  "api-keys": "Nova chave",
  webhooks: "Novo endpoint",
};

/** Whether this tab's actions belong in the band at all. */
const hasBandActions = (tab: IntegrationTab): boolean =>
  CREATE_LABEL[tab] !== undefined;

const IntegrationsPageActions = ({
  activeTab,
  businessId,
  mode,
}: IntegrationsPageActionsProps): JSX.Element => {
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState<boolean>(false);

  const queryKey = QUERY_KEY[activeTab];

  // The spinner belongs to the panel's own request, whichever filter it is
  // currently on.
  const inFlight = useIsFetching([queryKey, businessId]);

  // The whole tab, like every "Atualizar" (decision 2.1): the server content,
  // the cached reads and what is on screen. It used to invalidate the open
  // tab's own key and nothing else (REV-1).
  const { revalidate, isRevalidating } = useRevalidateScreen();

  // h-9 on /admin and /dashboard (decision 16.61); full width on a phone
  // with the label (decision 3.6).
  const actionClassName = usePageActionClassName();

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.INTEGRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.INTEGRATION_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;
  const createLabel = CREATE_LABEL[activeTab] ?? "";

  return (
    <PageActions>
      <RefreshButton
        storageKey={RATE_LIMIT_KEY[activeTab]}
        isRefreshing={isRevalidating || inFlight > 0}
        className={actionClassName}
        onRefresh={() => void revalidate()}
      />

      {/*
        The developer portal, from the screen that issues keys and endpoints
        (decision 11.1). A link, not a button: it opens in a new tab so the
        screen stays as it is.
      */}
      <Button
        asChild
        variant="outline"
        size="sm"
        className={`${actionClassName} gap-2`}
      >
        <a
          href={INTEGRATION_DOCS.home}
          target="_blank"
          rel="noopener noreferrer"
          data-tutorial="integrations-docs"
        >
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Documentação da API</span>
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </Button>

      {createLabel !== "" && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              {/*
                The trigger wraps the button rather than being it: a disabled
                button fires no pointer events, so the tooltip explaining WHY
                it is disabled would never open — which is the one moment it is
                needed.
              */}
              <div className="min-w-0">
                <Button
                  type="button"
                  size="sm"
                  className={`${actionClassName} gap-2`}
                  disabled={!canWrite || !businessId}
                  onClick={() => setIsCreating(true)}
                  data-tutorial="create-button"
                >
                  <CreateButtonLabel>{createLabel}</CreateButtonLabel>
                </Button>
              </div>
            </TooltipTrigger>

            {!canWrite && (
              <TooltipContent className="max-w-sm">
                <p>{permissionsRequired.tooltipMessage}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {isCreating && activeTab === "api-keys" && (
        <ApiKeyDialog
          businessId={businessId}
          mode={mode}
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onCreated={() => {
            void queryClient.invalidateQueries([queryKey, businessId]);
          }}
        />
      )}

      {isCreating && activeTab === "webhooks" && (
        <WebhookFormDialog
          businessId={businessId}
          endpoint={null}
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onSaved={() => {
            void queryClient.invalidateQueries([queryKey, businessId]);
          }}
        />
      )}
    </PageActions>
  );
};

/**
 * Atualizar alone, for a company the screen was refused for (module, profile
 * or inactive company). Nothing here writes, so none of the create buttons;
 * but the refusal is a read like any other and Atualizar re-asks it (decision
 * 2.1) — after a master enables Entregas, the screen recovers from here.
 */
const IntegrationsRefreshAction = ({
  activeTab,
}: {
  activeTab: IntegrationTab;
}): JSX.Element => {
  const { revalidate, isRevalidating } = useRevalidateScreen();
  const actionClassName = usePageActionClassName();

  return (
    <PageActions>
      <RefreshButton
        storageKey={RATE_LIMIT_KEY[activeTab]}
        isRefreshing={isRevalidating}
        className={actionClassName}
        onRefresh={() => void revalidate()}
      />
    </PageActions>
  );
};

export { IntegrationsPageActions, IntegrationsRefreshAction, hasBandActions };
