import { PackageX, Route as RouteIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { parseNDJSON } from "@/lib/parse-nd-json";

import { RoutesPageActions } from "../page-actions";
import { RoutesRealtime } from "../realtime";
import { RoutesStats } from "../stats";
import { RoutesTable } from "../table";

interface RoutesContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    businessId?: string;
  };
  token: string;
}

const RoutesContent = async ({
  mode,
  searchParams,
  token,
}: RoutesContentProps): Promise<JSX.Element> => {
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";
  const businessId = searchParams.businessId;

  const renderHeader = (withActions: boolean) => (
    <div className="space-y-4">
      {mode === "admin" && <BusinessSelector currentBusinessId={businessId} />}

      <div className="flex flex-wrap items-center gap-3">
        {withActions && <RoutesPageActions />}
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

  // The master has to choose a company before anything can be fetched: there
  // is no "all companies" route board, and pretending otherwise would show an
  // empty table that looks like an operation with no routes.
  if (mode === "admin" && !businessId) {
    return (
      <div className="space-y-6 my-6">
        {renderHeader(false)}

        <div
          className="flex h-72 flex-col items-center justify-center
          rounded-lg border-2 border-dashed"
        >
          <RouteIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Selecione uma empresa para ver as rotas da operação dela.
          </p>
        </div>
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
      `${process.env.HTTP_REQUEST}/route/list-routes?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: ["update-route"] },
      },
    );
  } catch (error) {
    responseError = {
      error: true,
      errorMessage: "Ocorreu um erro inesperado ao tentar recuperar as rotas",
    };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      // The module gate lives in the API — a 403 here is the honest answer to
      // "does this company have Entregas?", with no extra round-trip.
      if (response.status === 403) {
        isModuleDisabled = true;
      } else {
        responseError = {
          error: true,
          errorMessage: "Houve um erro ao tentar recuperar a lista de rotas",
        };
      }
    } else {
      // NDJSON: an envelope line, then one route per line. `searchMeta` is
      // where the status tally lands — sendAsNDJSON nests the use case's own
      // `meta` under that key.
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
      {/*
        Renders nothing; it makes the board follow the operation. The API has
        emitted `routeEvent` since routes existed and nothing listened, so a
        route stayed RELEASED on screen while the driver was already out.
      */}
      <RoutesRealtime businessId={businessId} />

      {renderHeader(true)}

      <RoutesStats total={meta.total} searchMeta={searchMeta} />

      <RoutesTable data={rows} meta={meta} responseError={responseError} />
    </div>
  );
};

export { RoutesContent };
