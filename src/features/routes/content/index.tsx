import { Route as RouteIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { BusinessSelector } from "@/app/(protected)/_components/shared/business-selector";
import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { parseNDJSON } from "@/lib/parse-nd-json";
import { readBusinessIdParam } from "@/lib/business-id-param";
import { readAccessError, type AccessError } from "@/lib/access-error";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { RoutesPageActions } from "../page-actions";
import { RoutesRealtime } from "../realtime";
import { RoutesStats } from "../stats";
import { RoutesTable } from "../table";
import { routesListQuery, type RouteListSearchMeta } from "../server-table";

interface RoutesContentProps {
  /** "admin" lets the master pick a company; "dashboard" uses the session's. */
  mode: "admin" | "dashboard";
  /** Every param of the URL: the table's sort and facets travel here too. */
  searchParams: Record<string, string | string[] | undefined>;
  token: string;
}

const RoutesContent = async ({
  mode,
  searchParams,
  token,
}: RoutesContentProps): Promise<JSX.Element> => {
  const param = (name: string): string | undefined => {
    const value = searchParams[name];

    return Array.isArray(value) ? value[0] : value;
  };

  const page = Number(param("page")) || 1;
  const pageSize = Number(param("pageSize")) || 10;

  const search = param("search") || "";
  // Only a company id from the URL: it becomes a segment of API paths
  // requested with the viewer's token.
  const businessId = readBusinessIdParam(param("businessId"));

  /**
   * The same band Entregas uses: company on the left, actions on the right,
   * one line while there is room for one.
   *
   * What was here rendered the actions inside a `flex` row of their own UNDER
   * the selector — and rendered that row even when `withActions` was false, so
   * the states that have no actions still paid for a 16px gap under an empty
   * element. On the screen where a master has not chosen a company yet, that
   * put more air between the selector and the empty state than Torre de
   * Controle puts there, on two pages that ask the same question.
   */
  const renderHeader = (withActions: boolean) => (
    <ProtectedPageToolbar
      context={
        mode === "admin" ? (
          <BusinessSelector currentBusinessId={businessId} />
        ) : undefined
      }
      actions={withActions ? <RoutesPageActions /> : undefined}
    />
  );

  /**
   * A refusal, said as what it is (decision 4.1): only MODULE_NOT_ENABLED is
   * the module state. A profile without `delivery_manage` used to read
   * "Módulo Entregas não contratado" for a company that had hired it. The
   * MASTER gets the way to enable the module for the selected company
   * (decision 4.3).
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

  // The master has to choose a company before anything can be fetched: there
  // is no "all companies" route board, and pretending otherwise would show an
  // empty table that looks like an operation with no routes.
  if (mode === "admin" && !businessId) {
    return (
      <div className="space-y-6 my-6">
        {renderHeader(false)}

        <SelectBusinessEmptyState
          icon={RouteIcon}
          description="Não existe um quadro de rotas de todas as empresas: escolha a operação acima."
        />
      </div>
    );
  }

  let responseError = { error: false, errorMessage: "" };

  let rows: unknown[] = [];
  let meta = { total: 0, page, pageSize };

  let searchMeta: RouteListSearchMeta | undefined;

  let accessError: AccessError | null = null;
  let response: Response | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...(businessId && { businessId }),
    // Sort and facets the table declared (decision 8.8): the API answers
    // them for the whole company, never the loaded page.
    ...routesListQuery(searchParams),
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

      // A 403 names its reason in `code` (decision 4.1): module, permission
      // or inactive company — never guessed from the status alone.
      if (response.status === 403) {
        accessError = (await readAccessError(response)) ?? {
          kind: "permission-denied",
          message: null,
        };
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

  if (accessError) {
    return renderAccessError(accessError);
  }

  return (
    // Keyed by the company (decision 2.6): switching it on /admin remounts
    // the board, so no dialog, filter or row state of A survives under B.
    <div
      key={businessId ?? "session"}
      className="space-y-6 my-6"
      data-tutorial="welcome"
    >
      {/*
        Renders nothing; it makes the board follow the operation. The API has
        emitted `routeEvent` since routes existed and nothing listened, so a
        route stayed RELEASED on screen while the driver was already out.
      */}
      <RoutesRealtime businessId={businessId} />

      {renderHeader(true)}

      {/* The cards read the disjunctive tally only; meta.total is the pager's. */}
      <RoutesStats searchMeta={searchMeta} />

      <RoutesTable
        data={rows}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { RoutesContent };
