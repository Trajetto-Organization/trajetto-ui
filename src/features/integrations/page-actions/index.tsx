"use client";

import { useState } from "react";
import { useIsFetching, useQueryClient } from "react-query";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { RefreshButton } from "@/components/shared/custom/refresh-button";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import type { IntegrationTab } from "../lib/tabs";

import { ApiKeyDialog } from "../api-keys/create-dialog";
import { WebhookFormDialog } from "../webhooks/form-dialog";

/**
 * What can be done to the company's integrations, in the page's top band.
 *
 * These buttons used to live INSIDE each panel, in a row of their own under
 * the section strip — so "Atualizar" and "Nova chave" sat between the
 * navigation and the list, reading as the list's rather than the section's.
 * Entregas moved the same buttons up beside the company selector; this is that
 * same band, for the same reason.
 *
 * Nothing is lifted out of the panels to make it work. The refresh invalidates
 * the panel's react-query key, which is the panel's own contract with the
 * cache — no callback threaded down, no state hoisted, and a panel that is not
 * mounted simply has nothing to invalidate.
 */
interface IntegrationsPageActionsProps {
  activeTab: IntegrationTab;
  businessId: string;
}

/**
 * The cache key each tab reads, by prefix.
 *
 * Partial matching is what makes this safe: the monitor keys on
 * `[key, businessId, status, page]` and the usage panel on `[key, businessId,
 * days]`, and invalidating the prefix reaches whichever page and filter the
 * person is actually looking at without this file having to know about either.
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
 * is the refresh keeps it beside the numbers that refresh changes. In the
 * monitor those numbers are four metric cards sitting between the band and the
 * filter — a button three elements above them is a button nobody connects to
 * them.
 *
 * So there is one rule, not two: actions live in the band, unless the only
 * action is a refresh over figures the panel draws.
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
}: IntegrationsPageActionsProps): JSX.Element => {
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState<boolean>(false);

  const queryKey = QUERY_KEY[activeTab];

  // The spinner belongs to the panel's own request, whichever filter it is
  // currently on — same prefix match the invalidation uses.
  const inFlight = useIsFetching([queryKey, businessId]);

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
    <div
      /*
        The same bar Entregas uses: one row on a phone with the primary action
        taking the width it needs, wrapping from `sm` up rather than stretching
        into a single row that neither wraps nor shrinks.
      */
      className="flex w-full min-w-0 items-center gap-2 sm:w-auto
      sm:flex-wrap sm:justify-end"
    >
      <div className="shrink-0">
        <RefreshButton
          storageKey={RATE_LIMIT_KEY[activeTab]}
          isRefreshing={inFlight > 0}
          hideLabelOnMobile
          className="h-9 w-9 p-0 sm:h-8 sm:w-auto sm:px-3"
          onRefresh={() => {
            void queryClient.invalidateQueries([queryKey, businessId]);
          }}
        />
      </div>

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
              <div className="min-w-0 flex-1 sm:w-auto sm:flex-initial">
                <Button
                  type="button"
                  size="sm"
                  /*
                    `h-9` on a phone for the touch target, `h-8` from `sm` up —
                    the height every other action bar in the product settles
                    on. It used to inherit `size="sm"`'s h-9 at every width,
                    which put it 4px taller than the "Atualizar" beside it.
                  */
                  className="h-9 w-full gap-2 sm:h-8"
                  disabled={!canWrite || !businessId}
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="truncate">{createLabel}</span>
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
    </div>
  );
};

export { IntegrationsPageActions, hasBandActions };
