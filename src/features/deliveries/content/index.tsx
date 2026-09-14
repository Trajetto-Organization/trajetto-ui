import { PackageX } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { parseDeliveryTab, type DeliveryTab } from "../lib/tabs";
import { DeliveriesStats } from "../stats";
import { DeliveriesTabs } from "../tabs";

import { DeliveriesPageActions } from "../page-actions";
import { DeliveriesTable } from "../table";

import { MonitoringPanel } from "../monitoring";
import { ChatPanel } from "../chat";

import type { OperationSummaryData } from "../lib/panels";

interface DeliveriesContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  searchParams: {
    tab?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    businessId?: string;
  };
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
    errorMessage:
      "Houve um erro ao tentar recuperar os tipos de ocorrência",
  },
};

const DeliveriesContent = async ({
  mode,
  searchParams,
  token,
}: DeliveriesContentProps): Promise<JSX.Element> => {
  const activeTab = parseDeliveryTab(searchParams.tab);

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";
  const businessId = searchParams.businessId;

  const source = TAB_SOURCES[activeTab];

  /**
   * Tabs and page actions share a line while there is room; below `lg` the
   * actions drop under the tabs instead of squeezing them, and on phones
   * each button spans the width.
   */
  const renderHeader = (withActions: boolean) => (
    <div className="space-y-4">
      {mode === "admin" && <BusinessSelector currentBusinessId={businessId} />}

      <div className="flex flex-wrap items-center gap-3">
        <DeliveriesTabs activeTab={activeTab} />

        {withActions && <DeliveriesPageActions activeTab={activeTab} />}
      </div>
    </div>
  );

  const renderModuleDisabled = () => (
    <div className="space-y-6 my-6">
      {renderHeader(false)}

      <div
        className="flex h-72 flex-col items-center justify-center
        rounded-lg border-2 border-dashed"
      >
        <PackageX className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <p className="max-w-md text-center text-sm text-muted-foreground">
          O módulo <strong>Entregas</strong> não está habilitado para esta
          empresa. Fale com o suporte para contratar.
        </p>
      </div>
    </div>
  );

  // The master has to choose whose deliveries to look at before anything
  // can be fetched.
  if (mode === "admin" && !businessId) {
    return (
      <div className="space-y-6 my-6">
        {renderHeader(false)}

        <div
          className="flex h-72 flex-col items-center justify-center
          rounded-lg border-2 border-dashed"
        >
          <p className="text-center text-sm text-muted-foreground">
            Selecione uma empresa para visualizar as entregas
          </p>
        </div>
      </div>
    );
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
      return renderModuleDisabled();
    }

    return (
      <div className="space-y-4 my-6" data-tutorial="welcome">
        {renderHeader(true)}

        <ChatPanel businessId={businessId} />
      </div>
    );
  }

  // Monitoring is a panel, not a table: its numbers come from the summary
  // endpoint and render as cards plus the per-driver board.
  if (activeTab === "monitoring") {
    let summaryResponse: Response | undefined;
    let summary: OperationSummaryData | null = null;

    let monitoringDisabled = false;
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
        monitoringDisabled = true;
      } else if (!summaryResponse.ok) {
        monitoringError = "Houve um erro ao montar o resumo da operação";
      } else {
        const body = (await summaryResponse.json()) as {
          data: OperationSummaryData;
        };

        summary = body.data;
      }
    }

    if (monitoringDisabled) {
      return renderModuleDisabled();
    }

    return (
      <div className="space-y-4 my-6" data-tutorial="welcome">
        {renderHeader(true)}

        {summary ? (
          <>
            <DeliveriesStats
              activeTab={activeTab}
              total={0}
              searchMeta={summary.totals as unknown as Record<string, unknown>}
            />

            <MonitoringPanel summary={summary} />
          </>
        ) : (
          <div
            className="flex h-72 items-center justify-center rounded-lg
            border-2 border-dashed"
          >
            <p className="text-center text-sm text-muted-foreground">
              {monitoringError || "Sem dados da operação."}
            </p>
          </div>
        )}
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };

  let rows: unknown[] = [];
  let meta = { total: 0, page, pageSize };

  let searchMeta: Record<string, unknown> | undefined;

  let isModuleDisabled = false;
  let response: Response | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...(businessId && { businessId }),
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

      // The module gate lives in the API — a 403 here is the honest answer
      // to "does this company have Entregas?", with no extra round-trip.
      if (response.status === 403) {
        isModuleDisabled = true;
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

  if (isModuleDisabled) {
    return renderModuleDisabled();
  }

  return (
    <div className="space-y-4 my-6" data-tutorial="welcome">
      {renderHeader(true)}

      <DeliveriesStats
        activeTab={activeTab}
        total={meta.total}
        searchMeta={searchMeta}
      />

      <DeliveriesTable
        activeTab={activeTab}
        data={rows}
        meta={meta}
        responseError={responseError}
      />
    </div>
  );
};

export { DeliveriesContent };
