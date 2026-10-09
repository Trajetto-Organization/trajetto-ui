import { Building2, CalendarX2, Coffee } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";

import { readBusinessIdParam } from "@/lib/business-id-param";
import { readAccessError, type AccessError } from "@/lib/access-error";
import { fetchSessionAccess } from "@/lib/session-access";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { EmptyState } from "@/components/shared/custom/empty-state";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { DriverPausesPageActions } from "../page-actions";
import { DriverPausesStats } from "../stats";
import { DriverPausesTable } from "../table";
import { PauseRulesNote } from "../rules-note";
import { pauseReportQuery } from "../server-table";
import { formatWorkdayDay } from "../lib/pause-format";

import type { PauseReport } from "../types";

interface DriverPausesContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  /** Every param of the URL: period, filters and page travel here. */
  searchParams: Record<string, string | string[] | undefined>;
  token: string;
}

/**
 * The pause report (decision 6.1): per driver and workday, in the company's
 * zone, with the Lei 13.103/2015 alerts. It lives beside Rotas and Torre de
 * Controle because it reads the same operation (routes on the street and the
 * driver's day), and behind the same permission: `delivery_manage`.
 */
const DriverPausesContent = async ({
  mode,
  searchParams,
  token,
}: DriverPausesContentProps): Promise<JSX.Element> => {
  const param = (name: string): string | undefined => {
    const value = searchParams[name];

    return Array.isArray(value) ? value[0] : value;
  };

  // The report route names the company in its path: the master's pick, or
  // the session's own (the same /user/me the layout already read).
  const businessId =
    mode === "admin"
      ? readBusinessIdParam(param("businessId"))
      : readBusinessIdParam((await fetchSessionAccess(token))?.businessId);

  const renderHeader = (withActions: boolean) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={withActions ? <DriverPausesPageActions /> : undefined}
    />
  );

  // Decision 4.1: only MODULE_NOT_ENABLED is the module state.
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

  if (!businessId) {
    return (
      <div className="space-y-6 my-6">
        {renderHeader(false)}

        {mode === "admin" ? (
          <SelectBusinessEmptyState
            icon={Coffee}
            description="O relatório de pausas é de uma operação por vez: escolha a empresa acima."
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="Empresa não identificada"
            description="Não foi possível identificar a sua empresa agora. Use Atualizar ou entre novamente."
          />
        )}
      </div>
    );
  }

  const query = new URLSearchParams(pauseReportQuery(searchParams));

  let report: PauseReport | null = null;
  let responseError = { error: false, errorMessage: "" };
  let accessError: AccessError | null = null;
  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/driver-pause/report/${businessId}?${query.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar o relatório de pausas.",
    };
  }

  if (response) {
    if (response.status === 401) redirect("/login");

    if (response.status === 403) {
      // A 403 names its reason in `code` (decision 4.1).
      accessError = (await readAccessError(response)) ?? {
        kind: "permission-denied",
        message: null,
      };
    } else if (!response.ok) {
      // The API's own sentence when it says one (an impossible period, say).
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      responseError = {
        error: true,
        errorMessage:
          response.status === 400 && body?.message
            ? body.message
            : "Houve um erro ao tentar recuperar o relatório de pausas.",
      };
    } else {
      report = (await response.json().catch(() => null)) as PauseReport | null;

      if (!report) {
        responseError = {
          error: true,
          errorMessage:
            "Houve um erro ao tentar recuperar o relatório de pausas.",
        };
      }
    }
  }

  if (accessError) return renderAccessError(accessError);

  const meta = {
    total: report?.total ?? 0,
    page: report?.page ?? Number(query.get("page")),
    pageSize: report?.pageSize ?? Number(query.get("pageSize")),
  };

  const filtered = Boolean(query.get("driverId") || query.get("flag"));

  // An empty period is explained above the table; a filter that matched
  // nothing keeps the table's own sentence.
  const emptyPeriod = Boolean(report && report.total === 0 && !filtered);

  return (
    // Keyed by the company (decision 2.6): switching it on /admin remounts
    // the report, so no filter or row state of one company survives.
    <div key={businessId} className="space-y-6 my-6" data-tutorial="welcome">
      {renderHeader(true)}

      <DriverPausesStats searchMeta={report?.searchMeta} />

      {emptyPeriod && report && (
        <div data-testid="driver-pauses-empty">
          <EmptyState
            icon={CalendarX2}
            size="inline"
            title="Nenhuma jornada no período"
            description={`Nenhum motorista saiu com rota ou registrou pausa de ${formatWorkdayDay(
              report.from,
            )} a ${formatWorkdayDay(
              report.to,
            )}. As pausas aparecem aqui quando o motorista as inicia e encerra no aplicativo.`}
          />
        </div>
      )}

      <DriverPausesTable
        data={report?.data ?? []}
        meta={meta}
        responseError={responseError}
        searchMeta={report?.searchMeta}
        timeZone={report?.timeZone}
        period={report ? { from: report.from, to: report.to } : undefined}
        emptyMessage={emptyPeriod ? null : undefined}
      />

      <PauseRulesNote timeZone={report?.timeZone} />
    </div>
  );
};

export { DriverPausesContent };
