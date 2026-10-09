import { Activity, Package } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";
import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { parseNDJSON } from "@/lib/parse-nd-json";
import { readBusinessIdParam } from "@/lib/business-id-param";
import { readAccessError, type AccessError } from "@/lib/access-error";
import { fetchCompanyRefusal, fetchSessionAccess } from "@/lib/session-access";

import {
  DELIVERY_TABS,
  accessibleDeliveryTabs,
  parseDeliveryTab,
  type DeliveryTab,
} from "../lib/tabs";
import { DeliveriesStats } from "../stats";
import { DeliveriesRealtime } from "../realtime";
import { DeliveriesTabs } from "../tabs";

import { DeliveriesPageActions } from "../page-actions";
import { DeliveriesTable } from "../table";
import { deliveryTabListQuery } from "../lib/list-query";

// One chunk per panel, loaded when its tab renders (lazy-panels.tsx).
import {
  ChatPanel,
  MessageTemplatesPanel,
  MonitoringPanel,
  ProofAuditsPanel,
} from "./lazy-panels";

import type { OperationSummaryData } from "../lib/panels";

interface DeliveriesContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  /**
   * Every param of the URL, as Next passes it: the table's sort and facet
   * params (decision 8.8) travel next to the named ones.
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

/** Each tab is a different endpoint, cache tag and empty state. */
const TAB_SOURCES: Record<
  DeliveryTab,
  { path: string; tag: string; errorMessage: string }
> = {
  deliveries: {
    path: "/delivery/list-delivery",
    tag: "update-delivery",
    errorMessage: "Houve um erro ao tentar recuperar a lista de entregas",
  },
  shippers: {
    path: "/shipper/list-shipper",
    tag: "update-shipper",
    errorMessage: "Houve um erro ao tentar recuperar a lista de embarcadores",
  },
  occurrences: {
    path: "/delivery/list-occurrences",
    tag: "update-delivery",
    errorMessage: "Houve um erro ao tentar recuperar as ocorrências",
  },
  // Never fetched: the monitoring tab branches to the summary endpoint
  // before the generic list flow runs. The entry only satisfies the map.
  monitoring: {
    path: "/delivery/operation-summary",
    tag: "update-delivery",
    errorMessage: "Houve um erro ao montar o resumo da operação",
  },
  // Never fetched either: the chat panel is a live client surface that owns
  // its own fetching and realtime. The entry only satisfies the map.
  chat: {
    path: "/chat/list-threads",
    tag: "update-delivery",
    errorMessage: "Houve um erro ao carregar as conversas",
  },
  "occurrence-types": {
    path: "/occurrence-type/list-occurrence-type",
    tag: "update-occurrence-type",
    errorMessage: "Houve um erro ao tentar recuperar os tipos de ocorrência",
  },
  "status-change-reasons": {
    path: "/status-change-reason/list-status-change-reason",
    tag: "update-status-change-reason",
    errorMessage: "Houve um erro ao tentar recuperar os motivos de status",
  },
  imports: {
    path: "/import/list-imports",
    tag: "update-import",
    errorMessage: "Houve um erro ao tentar recuperar as importações",
  },
  // Never fetched: the panel is a client surface over six fixed slots and
  // owns its own loading. The entry only satisfies the map.
  "message-templates": {
    path: "/delivery/message-templates",
    tag: "update-delivery",
    errorMessage: "Houve um erro ao carregar as mensagens ao cliente",
  },
  // Never fetched either: the queue is a client panel with its own paging and
  // its own counters. The entry only satisfies the map.
  "proof-audits": {
    path: "/delivery/proof-audits",
    tag: "update-delivery",
    errorMessage: "Houve um erro ao carregar a fila de auditoria",
  },
};

const DeliveriesContent = async ({
  mode,
  searchParams,
  token,
}: DeliveriesContentProps): Promise<JSX.Element> => {
  /**
   * The tabs this session may read, decided before anything is fetched: a
   * tab whose endpoint would refuse the profile is not drawn, and a link to
   * one opens the first tab the profile may read instead (DLV-RO-2). When the
   * session cannot be read here, every tab is drawn and each request stays
   * the gate.
   */
  const access = await fetchSessionAccess(token);

  const allowedTabs = access
    ? accessibleDeliveryTabs(access)
    : DELIVERY_TABS.map((tab) => tab.value);

  const activeTab = parseDeliveryTab(searchParams.tab, allowedTabs);

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";
  // Only a company id from the URL: it becomes a segment of API paths
  // requested with the viewer's token.
  const businessId = readBusinessIdParam(searchParams.businessId);

  /**
   * The company a client panel acts on: the one picked on /admin, or the
   * session's own on /dashboard. Passed as `""`, the message templates were
   * listed with `?businessId=` (a 400 that read as "no templates") and saved
   * to `/message-template/` (DLVB-03).
   */
  const panelBusinessId = businessId ?? access?.businessId ?? undefined;

  const source = TAB_SOURCES[activeTab];

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
   * (no company chosen, module not contracted) and on Auditoria de
   * Comprovantes, whose only action is the refresh and belongs next to that
   * panel's own queue filters rather than up here away from them.
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

  /** A 403 whose body could not be read is still not the module state. */
  const refusalOf = async (response: Response): Promise<AccessError> =>
    (await readAccessError(response)) ?? {
      kind: "permission-denied",
      message: null,
    };

  // The master has to choose whose deliveries to look at before anything
  // can be fetched. Every branch below therefore has a company: the
  // selected one, or the session's on /dashboard.
  if (mode === "admin" && !businessId) {
    return (
      <div className="space-y-6 my-6">
        {renderHeader(false)}

        <SelectBusinessEmptyState
          icon={Package}
          description="As entregas da empresa escolhida aparecem aqui, com o monitoramento do dia, as conversas com os motoristas e os cadastros de Entregas."
        />
      </div>
    );
  }

  // The MASTER looks at a company chosen above, which may never have hired
  // Entregas, or may be switched off. Asked once, of one of the module's own
  // routes, before any tab is fetched, so the client panels (chat,
  // auditoria, mensagens) show the same state as the tables.
  if (mode === "admin" && businessId) {
    const refusal = await fetchCompanyRefusal(
      token,
      "/delivery/message-templates",
      businessId,
    );

    if (refusal) return renderAccessError(refusal);
  }

  if (allowedTabs.length === 0) {
    return renderAccessError({ kind: "permission-denied", message: null });
  }

  // The chat is a live two-pane surface: the client panel owns fetching,
  // realtime and its own empty states. The server asks one light question —
  // is the module on for this company? — so the disabled state renders
  // exactly like every other tab's.
  if (activeTab === "chat") {
    let probeResponse: Response | undefined;

    try {
      probeResponse = await fetch(
        `${process.env.HTTP_REQUEST}/chat/list-threads?page=1&pageSize=1${
          businessId ? `&businessId=${businessId}` : ""
        }`,
        {
          credentials: "include",
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );
    } catch (error) {
      // Network trouble: the client panel surfaces it with a retry button.
    }

    if (probeResponse?.status === 401) {
      redirect("/login");
    }

    if (probeResponse?.status === 403) {
      return renderAccessError(await refusalOf(probeResponse));
    }

    return (
      <div className="space-y-6 my-6" data-tutorial="welcome">
        {renderHeader(true)}

        {/* Keyed by company (decision 2.6): the open conversation is local
            state and must not survive a switch to another company. */}
        <ChatPanel key={businessId ?? "session"} businessId={businessId} />
      </div>
    );
  }

  // The queue a person works through. A client panel with its own paging and
  // its own counters, like the chat.
  if (activeTab === "proof-audits") {
    return (
      <div className="space-y-6 my-6" data-tutorial="welcome">
        {/*
          No action bar up here on purpose: "Atualizar" is the only one
          this tab has, and the panel below it has its own row of filters —
          Na fila, Aprovados, Rejeitados. A refresh button floating two
          elements above the thing it refreshes is a button nobody connects to
          the counters it changes.
        */}
        {renderHeader(false)}

        <ProofAuditsPanel
          key={businessId ?? "session"}
          businessId={panelBusinessId}
        />
      </div>
    );
  }

  // Six fixed slots, written in place. A client panel with its own fetching,
  // like the chat — there is no list to page and nothing to search.
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

  // Monitoring is a panel, not a table: its numbers come from the summary
  // endpoint and render as cards plus the per-driver board.
  if (activeTab === "monitoring") {
    let summaryResponse: Response | undefined;
    let summary: OperationSummaryData | null = null;

    let monitoringRefusal: AccessError | null = null;
    let monitoringError = "";

    try {
      summaryResponse = await fetch(
        `${process.env.HTTP_REQUEST}/delivery/operation-summary${
          businessId ? `?businessId=${businessId}` : ""
        }`,
        {
          credentials: "include",
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          next: { tags: ["update-delivery"] },
        },
      );
    } catch (error) {
      monitoringError =
        "Ocorreu um erro inesperado ao montar o resumo da operação";
    }

    if (summaryResponse) {
      if (summaryResponse.status === 401) {
        redirect("/login");
      }

      if (summaryResponse.status === 403) {
        monitoringRefusal = await refusalOf(summaryResponse);
      } else if (!summaryResponse.ok) {
        monitoringError = "Houve um erro ao montar o resumo da operação";
      } else {
        const body = (await summaryResponse.json()) as {
          data: OperationSummaryData;
        };

        summary = body.data;
      }
    }

    if (monitoringRefusal) {
      return renderAccessError(monitoringRefusal);
    }

    return (
      <div className="space-y-6 my-6" data-tutorial="welcome">
        {/*
          The six numbers here change with every stop that settles. Without
          this they changed only when somebody pressed Atualizar.
        */}
        <DeliveriesRealtime businessId={businessId} />

        {renderHeader(true)}

        {summary ? (
          <>
            <DeliveriesStats
              activeTab={activeTab}
              total={0}
              searchMeta={summary.totals as unknown as Record<string, unknown>}
            />

            {/* The boards read their own endpoints live; the summary only
                feeds the cards above. */}
            <MonitoringPanel key={businessId ?? "session"} />
          </>
        ) : (
          <EmptyState
            icon={Activity}
            title={
              monitoringError
                ? "Não foi possível carregar"
                : "Sem dados da operação"
            }
            description={
              monitoringError ||
              "O quadro se enche quando houver entregas atribuídas a motoristas hoje."
            }
          />
        )}
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };

  let rows: unknown[] = [];
  let meta = { total: 0, page, pageSize };

  let searchMeta: Record<string, unknown> | undefined;

  let refusal: AccessError | null = null;
  let response: Response | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...(businessId && { businessId }),
    // The table's sort and facets (decision 8.8): deliveries, occurrences
    // and the four catalog tabs. The panels send none.
    ...deliveryTabListQuery(activeTab, searchParams),
  });

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}${source.path}?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: [source.tag] },
      },
    );
  } catch (error) {
    responseError = {
      error: true,
      errorMessage: `Ocorreu um erro inesperado ao tentar recuperar ${
        activeTab === "deliveries" ? "as entregas" : "os dados"
      }`,
    };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      // The API names its refusal: module, permission or inactive company.
      if (response.status === 403) {
        refusal = await refusalOf(response);
      } else {
        responseError = { error: true, errorMessage: source.errorMessage };
      }
    } else {
      const { meta: metaParsed, data } = await parseNDJSON(response);

      rows = data;
      meta = metaParsed ?? { total: data.length, page, pageSize };

      searchMeta = metaParsed?.searchMeta;
    }
  }

  if (refusal) {
    return renderAccessError(refusal);
  }

  return (
    <div className="space-y-6 my-6" data-tutorial="welcome">
      {/*
        Only the tab being shown is invalidated: a dispatcher reading
        Embarcadores has no reason to refetch because a truck arrived, and
        these events arrive all day.
      */}
      <DeliveriesRealtime businessId={businessId} />

      {renderHeader(true, meta.total > 0)}

      <DeliveriesStats
        activeTab={activeTab}
        total={meta.total}
        searchMeta={searchMeta}
      />

      {/* searchMeta and catalogServerMode go WITH the sort and facet params
          sent above: they switch the tables to answering on the server
          (decision 8.8). One without the other would show filter chips over
          an unfiltered list. */}
      <DeliveriesTable
        key={businessId ?? "session"}
        activeTab={activeTab}
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
        catalogServerMode
      />
    </div>
  );
};

export { DeliveriesContent };
