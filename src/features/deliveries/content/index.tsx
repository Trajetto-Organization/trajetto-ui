import { Package } from "lucide-react";
import { redirect } from "next/navigation";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";
import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { readBusinessIdParam } from "@/lib/business-id-param";
import type { AccessError } from "@/lib/access-error";
import { fetchCompanyRefusal, fetchSessionAccess } from "@/lib/session-access";

import {
  DELIVERY_TABS,
  accessibleDeliveryTabs,
  parseDeliveryTab,
} from "../lib/tabs";
import { DeliveriesStats } from "../stats";
import { DeliveriesRealtime } from "../realtime";
import { DeliveriesTabs } from "../tabs";

import { DeliveriesPageActions } from "../page-actions";
import { DeliveriesTable } from "../table";

import { isLocalCatalogTab } from "../lib/catalog-local";

import { DeliveriesCatalogSection } from "./catalog-section";
import {
  isDeliveryListSection,
  readDeliveryList,
  type ListSearchParams,
} from "./list-read";

// One chunk per panel, loaded when its tab renders (lazy-panels.tsx).
import { MessageTemplatesPanel } from "./lazy-panels";

interface DeliveriesContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  /**
   * Every param of the URL, as Next passes it: the table's sort, facet and
   * period params (decision 8.8, meeting of 14/10/2026) travel next to the
   * named ones.
   */
  searchParams: {
    tab?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    businessId?: string;
  } & Record<string, string | string[] | undefined>;
  token: string;
}

/**
 * Entregas: the registrations and imports of the module (meeting of
 * 14/10/2026). The operation's sections — Monitoramento, Ocorrências,
 * Atendimentos, Auditoria — are views of the Torre de controle; the page
 * redirects their old links there before this renders.
 */
const DeliveriesContent = async ({
  mode,
  searchParams,
  token,
}: DeliveriesContentProps): Promise<JSX.Element> => {
  // Only a company id from the URL: it becomes a segment of API paths
  // requested with the viewer's token.
  const businessId = readBusinessIdParam(searchParams.businessId);

  // The tab the URL asks for, before the session says whether it may. When
  // its key is the page's own (`delivery_manage`, which the middleware
  // already required to open the page), nothing the session says can send
  // the page elsewhere, so its list is read alongside the session instead
  // of after. A tab of another key (Tipos de Ocorrência) waits: a profile
  // without it is never sent to an endpoint that refuses it (DLV-RO-2).
  const requestedTab = parseDeliveryTab(searchParams.tab);

  const readsWithSession =
    DELIVERY_TABS.find((tab) => tab.value === requestedTab)
      ?.requiredPermission === "delivery_manage";

  const needsCompany = mode === "admin" && !businessId;

  /**
   * The three reads that do not depend on each other leave together: the
   * session's access (memoised per request with the layout's /user/me), the
   * MASTER's company refusal, and the requested tab's list. They used to go
   * one after the other — /user/me, then the company check, then the list —
   * on every navigation of the busiest page of the module. The refusal still
   * decides what renders: a list read beside it is simply not shown.
   */
  const [access, companyRefusal, requestedRead] = await Promise.all([
    fetchSessionAccess(token),
    // The MASTER looks at a company chosen above, which may never have
    // hired Entregas, or may be switched off. Asked once, of one of the
    // module's own routes, so the panels show the same state as the tables.
    mode === "admin" && businessId
      ? fetchCompanyRefusal(token, "/delivery/message-templates", businessId)
      : Promise.resolve(null),
    !needsCompany && readsWithSession && isDeliveryListSection(requestedTab)
      ? readDeliveryList({
          section: requestedTab,
          token,
          businessId,
          searchParams: searchParams as ListSearchParams,
        })
      : Promise.resolve(null),
  ]);

  /**
   * The tabs this session may read: a tab whose endpoint would refuse the
   * profile is not drawn, and a link to one opens the first tab the profile
   * may read instead (DLV-RO-2). When the session cannot be read here,
   * every tab is drawn and each request stays the gate.
   */
  const allowedTabs = access
    ? accessibleDeliveryTabs(access)
    : DELIVERY_TABS.map((tab) => tab.value);

  const activeTab = parseDeliveryTab(searchParams.tab, allowedTabs);

  /**
   * The company a client panel acts on: the one picked on /admin, or the
   * session's own on /dashboard. Passed as `""`, the message templates were
   * listed with `?businessId=` (a 400 that read as "no templates") and saved
   * to `/message-template/` (DLVB-03).
   */
  const panelBusinessId = businessId ?? access?.businessId ?? undefined;

  /**
   * Company, then actions, then sections — in that order, and the first two
   * on one line.
   *
   * The actions used to sit UNDER the strip, which put them between the
   * sections and the table and made them read as the table's. They belong to
   * the section that is open — "Nova Entrega" on Entregas, "Novo Motivo" on
   * Motivos — so they go above it, beside the company whose deliveries they
   * would create.
   *
   * `withActions` is false on the states where there is nothing to act on
   * (no company chosen, module not contracted).
   */
  const renderHeader = (withActions: boolean, hasData = false) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={
        withActions ? (
          <DeliveriesPageActions activeTab={activeTab} hasData={hasData} />
        ) : undefined
      }
    >
      <DeliveriesTabs activeTab={activeTab} allowedTabs={allowedTabs} />
    </ProtectedPageToolbar>
  );

  /**
   * A refusal, said as what it is (decision 4.1). Only MODULE_NOT_ENABLED is
   * the module state; a profile without the tab's key reads "Sem permissão
   * para esta seção" — it used to read "Módulo Entregas não contratado" for a
   * company that had hired it (DLV-RO-1). The MASTER gets the way to enable
   * the module for the selected company (decision 4.3).
   */
  const renderAccessError = (error: AccessError) => (
    <div className="space-y-6 my-6">
      {renderHeader(false)}

      <AccessErrorState
        kind={error.kind}
        moduleLabel="Entregas"
        audience={mode === "admin" ? "master" : "company"}
        message={error.message}
        action={
          error.kind === "module-not-enabled" &&
          mode === "admin" &&
          businessId ? (
            <ManageModulesButton businessId={businessId} />
          ) : undefined
        }
      />
    </div>
  );

  // The master has to choose whose deliveries to look at before anything
  // can be fetched. Every branch below therefore has a company: the
  // selected one, or the session's on /dashboard.
  if (needsCompany) {
    return (
      <div className="space-y-6 my-6">
        {renderHeader(false)}

        <SelectBusinessEmptyState
          icon={Package}
          description="As entregas da empresa escolhida aparecem aqui, com os embarcadores, as importações e os cadastros de Entregas."
        />
      </div>
    );
  }

  if (companyRefusal) return renderAccessError(companyRefusal);

  if (allowedTabs.length === 0) {
    return renderAccessError({ kind: "permission-denied", message: null });
  }

  // Six fixed slots, written in place. A client panel with its own fetching
  // — there is no list to page and nothing to search.
  if (activeTab === "message-templates") {
    return (
      <div className="space-y-6 my-6" data-tutorial="welcome">
        {renderHeader(true)}

        {/* Only an unreadable session leaves no company here; the layout's
            own /user/me would have failed first. */}
        <MessageTemplatesPanel
          key={businessId ?? "session"}
          businessId={panelBusinessId ?? ""}
        />
      </div>
    );
  }

  // The read that went out with the session, unless the session sent the
  // page to another tab than the one the URL asked for.
  const read =
    requestedRead && activeTab === requestedTab
      ? requestedRead
      : await readDeliveryList({
          section: activeTab,
          token,
          businessId,
          searchParams: searchParams as ListSearchParams,
        });

  if (read.unauthorized) {
    redirect("/login");
  }

  if (read.refusal) {
    return renderAccessError(read.refusal);
  }

  return (
    <div className="space-y-6 my-6" data-tutorial="welcome">
      {/*
        Only the tab being shown is invalidated: a dispatcher reading
        Embarcadores has no reason to refetch because a truck arrived, and
        these events arrive all day.
      */}
      <DeliveriesRealtime businessId={businessId} />

      {renderHeader(true, read.meta.total > 0)}

      {/* Embarcadores, Tipos de ocorrência and Motivos: cards and table over
          one list query, answered in the browser when the read is the whole
          set (spec §13). Keyed by company: a switch starts it over. */}
      {isLocalCatalogTab(activeTab) ? (
        <DeliveriesCatalogSection
          key={businessId ?? "session"}
          activeTab={activeTab}
          data={read.rows}
          meta={read.meta}
          responseError={read.responseError}
          searchMeta={read.searchMeta}
          complete={read.complete}
        />
      ) : (
        <>
          <DeliveriesStats
            activeTab={activeTab}
            total={read.meta.total}
            searchMeta={read.searchMeta}
          />

          {/* searchMeta and catalogServerMode go WITH the sort and facet
              params sent above: they switch the tables to answering on the
              server (decision 8.8). One without the other would show filter
              chips over an unfiltered list. */}
          <DeliveriesTable
            key={businessId ?? "session"}
            activeTab={activeTab}
            data={read.rows}
            meta={read.meta}
            responseError={read.responseError}
            searchMeta={read.searchMeta}
            catalogServerMode
          />
        </>
      )}
    </div>
  );
};

export { DeliveriesContent };
