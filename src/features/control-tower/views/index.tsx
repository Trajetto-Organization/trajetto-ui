import { Activity, RadioTower } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";
import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { readBusinessIdParam } from "@/lib/business-id-param";
import { readAccessError, type AccessError } from "@/lib/access-error";
import { fetchCompanyRefusal, fetchSessionAccess } from "@/lib/session-access";

import { DeliveriesStats } from "@/features/deliveries/stats";
import { DeliveriesRealtime } from "@/features/deliveries/realtime";
import { DeliveriesTable } from "@/features/deliveries/table";
import {
  readDeliveryList,
  type ListSearchParams,
} from "@/features/deliveries/content/list-read";
// One chunk per panel, loaded when its view renders.
import {
  ChatPanel,
  MonitoringPanel,
  ProofAuditsPanel,
} from "@/features/deliveries/content/lazy-panels";
import type { OperationSummaryData } from "@/features/deliveries/lib/panels";

import type { MapTiles } from "../lib/map-tiles";
import {
  TOWER_VIEWS,
  accessibleTowerViews,
  isTowerView,
  parseTowerView,
} from "../lib/views";
import { ControlTowerPageActions } from "../page-actions";
import { ControlTowerShell } from "../shell";

import { ControlTowerViewTabs } from "./tabs";
// The Painel, the authorization queue and Ocorrências' action bar, one
// chunk each (lazy-views.tsx).
import {
  ControlTowerContent,
  DeliveriesPageActions,
  OccurrenceAuthorizationQueue,
} from "./lazy-views";

interface ControlTowerViewsProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  /** Every param of the URL: the view, and the open view's own (filters…). */
  searchParams: { view?: string; businessId?: string } & Record<
    string,
    string | string[] | undefined
  >;
  token: string;

  /** The base map, read by the page on the server (decision 7.4). */
  tiles: MapTiles | null;

  /** The app's background-tracking switch, read on the server (decision 7.3). */
  backgroundTracking?: boolean;
}

/** A GET the server asks with the viewer's token, without caching. */
async function serverRead(
  path: string,
  token: string,
): Promise<Response | undefined> {
  try {
    return await fetch(`${process.env.HTTP_REQUEST}${path}`, {
      credentials: "include",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    // Network trouble: the view's own client reads surface it with a retry.
    return undefined;
  }
}

/** A 403 whose body could not be read is still not the module state. */
const refusalOf = async (response: Response): Promise<AccessError> =>
  (await readAccessError(response)) ?? {
    kind: "permission-denied",
    message: null,
  };

/**
 * The Torre de controle and its views (product meeting of 14/10/2026):
 * Rotas (the board by route, the default), Painel (the map and the day's
 * widgets), Ocorrências, Atendimentos and Auditoria — the last three moved
 * from Entregas, with the same components, permissions and server reads.
 *
 * A server component, like Entregas: the occurrences are a server-side table
 * and the board's cards come from the server; the client views (the map,
 * the tickets, the audit queue) still fetch their own data. Every view shares
 * the Torre's header, cadence and full screen (shell).
 */
const ControlTowerViews = async ({
  mode,
  searchParams,
  token,
  tiles,
  backgroundTracking = false,
}: ControlTowerViewsProps): Promise<JSX.Element> => {
  // Only /admin picks the company from the URL, and only a company id: it
  // becomes a segment of API paths requested with the viewer's token. On
  // /dashboard it is always the session's.
  const businessId =
    mode === "admin" ? readBusinessIdParam(searchParams.businessId) : undefined;

  const needsCompany = mode === "admin" && !businessId;

  const [access, companyRefusal] = await Promise.all([
    fetchSessionAccess(token),
    mode === "admin" && businessId
      ? fetchCompanyRefusal(token, "/delivery/message-templates", businessId)
      : Promise.resolve(null),
  ]);

  /**
   * The views this session may read, decided before anything is fetched: a
   * view whose endpoint would refuse the profile is not drawn, and a link to
   * one opens the first view the profile may read. When the session cannot
   * be read here, every view is drawn and each request stays the gate.
   */
  const allowedViews = access
    ? accessibleTowerViews(access)
    : TOWER_VIEWS.map((view) => view.value);

  const view = parseTowerView(searchParams.view, allowedViews);

  /** The company a client view acts on: the picked one, or the session's. */
  const panelBusinessId = businessId ?? access?.businessId ?? undefined;

  const renderedAt = Date.now();

  /**
   * What waits for the tower's answer (decision 6.3), above the view. The
   * driver's authorization notices link to the Torre with no view, so they
   * land on the default view or on the last one this browser chose: both
   * must show the request. Painel and Ocorrências bring their own; the
   * tickets carry the request as a ticket and the red dot on their tab. It
   * hides itself while nothing waits.
   */
  const authorizationQueue = (
    <OccurrenceAuthorizationQueue
      key={businessId ?? "session"}
      businessId={businessId}
    />
  );

  /**
   * The Torre's frame around a view body: the company, the view's actions,
   * the views strip — then the cadence and the full screen (shell).
   *
   * `live` is false on the frames with nothing to read again — the company
   * prompt, a refusal: the cadence would re-render the server every minute
   * to draw the same sentence.
   */
  const frame = (
    body: JSX.Element,
    actions: "tower" | "occurrences" | "none" = "tower",
    hasData = false,
    live = true,
  ) => (
    <ControlTowerShell
      view={view}
      urlNamedView={isTowerView(searchParams.view)}
      allowedViews={allowedViews}
      renderedAt={renderedAt}
      live={live}
      header={
        <ProtectedPageToolbar
          context={
            mode === "admin" ? (
              <BusinessSelector currentBusinessId={businessId} />
            ) : undefined
          }
          actions={
            actions === "occurrences" ? (
              <DeliveriesPageActions
                activeTab="occurrences"
                hasData={hasData}
              />
            ) : actions === "tower" ? (
              <ControlTowerPageActions />
            ) : undefined
          }
        >
          <ControlTowerViewTabs activeView={view} allowedViews={allowedViews} />
        </ProtectedPageToolbar>
      }
    >
      {body}
    </ControlTowerShell>
  );

  /** A refusal, said as what it is (decision 4.1), in the Torre's frame. */
  const renderAccessError = (error: AccessError) =>
    frame(
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
      />,
      "none",
      false,
      false,
    );

  if (needsCompany) {
    return frame(
      <SelectBusinessEmptyState
        icon={RadioTower}
        description="A torre mostra as rotas do dia, onde os veículos estão agora, as ocorrências, os atendimentos e a auditoria dos comprovantes da empresa escolhida."
      />,
      "none",
      false,
      false,
    );
  }

  if (companyRefusal) return renderAccessError(companyRefusal);

  if (allowedViews.length === 0) {
    return renderAccessError({ kind: "permission-denied", message: null });
  }

  if (view === "panel") {
    return frame(
      <ControlTowerContent
        mode={mode}
        searchParams={{ businessId }}
        tiles={tiles}
        backgroundTracking={backgroundTracking}
      />,
    );
  }

  // The tickets are a live two-pane surface: the client panel owns fetching,
  // realtime and its own empty states. The server asks one light question —
  // is the module on for this company? — so the refusal renders like the
  // other views'.
  if (view === "tickets") {
    const probe = await serverRead(
      `/chat/list-threads?page=1&pageSize=1${
        businessId ? `&businessId=${businessId}` : ""
      }`,
      token,
    );

    if (probe?.status === 401) redirect("/login");
    if (probe?.status === 403) return renderAccessError(await refusalOf(probe));

    return frame(
      <div data-tutorial="welcome">
        {/* Keyed by company (decision 2.6): the open conversation is local
            state and must not survive a switch to another company. */}
        <ChatPanel key={businessId ?? "session"} businessId={businessId} />
      </div>,
    );
  }

  // The queue a person works through, with its own paging and counters. Its
  // Atualizar is the Torre's, in the header like every other view's
  // (decision of 28/10/2026): it drew its own beside the counters, the same
  // refresh of the whole tab one line further down, and the header's
  // placeholder jumped there when the queue arrived.
  if (view === "audit") {
    return frame(
      <div className="space-y-6" data-tutorial="welcome">
        {authorizationQueue}

        <ProofAuditsPanel
          key={businessId ?? "session"}
          businessId={panelBusinessId}
        />
      </div>,
    );
  }

  if (view === "occurrences") {
    const read = await readDeliveryList({
      section: "occurrences",
      token,
      businessId,
      searchParams: searchParams as ListSearchParams,
    });

    if (read.unauthorized) redirect("/login");
    if (read.refusal) return renderAccessError(read.refusal);

    return frame(
      <div className="space-y-6" data-tutorial="welcome">
        {/* A route event changes the feed (a stop settled with a proof). */}
        <DeliveriesRealtime businessId={businessId} />

        <DeliveriesStats
          activeTab="occurrences"
          total={read.meta.total}
          searchMeta={read.searchMeta}
        />

        <DeliveriesTable
          key={businessId ?? "session"}
          activeTab="occurrences"
          data={read.rows}
          meta={read.meta}
          responseError={read.responseError}
          searchMeta={read.searchMeta}
          catalogServerMode
        />
      </div>,
      "occurrences",
      read.meta.total > 0,
    );
  }

  // Rotas: the day's six numbers from the summary, over the board by route
  // (decision 6.6) — the view the meeting called the most important.
  const summaryResponse = await serverRead(
    `/delivery/operation-summary${businessId ? `?businessId=${businessId}` : ""}`,
    token,
  );

  if (summaryResponse?.status === 401) redirect("/login");

  if (summaryResponse?.status === 403) {
    return renderAccessError(await refusalOf(summaryResponse));
  }

  let summary: OperationSummaryData | null = null;

  if (summaryResponse?.ok) {
    try {
      summary = (
        (await summaryResponse.json()) as { data: OperationSummaryData }
      ).data;
    } catch {
      summary = null;
    }
  }

  return frame(
    <div className="space-y-6" data-tutorial="welcome">
      {authorizationQueue}

      {/* The six numbers change with every stop that settles. */}
      <DeliveriesRealtime businessId={businessId} />

      {summary ? (
        <DeliveriesStats
          activeTab="monitoring"
          total={0}
          searchMeta={summary.totals as unknown as Record<string, unknown>}
        />
      ) : (
        <EmptyState
          icon={Activity}
          size="inline"
          title="Números do dia indisponíveis"
          description="Não foi possível montar o resumo da operação agora. O quadro das rotas abaixo continua ao vivo."
        />
      )}

      {/* The board reads its own endpoint live; the summary only feeds the
          cards above. */}
      <MonitoringPanel key={businessId ?? "session"} />
    </div>,
  );
};

export { ControlTowerViews };
