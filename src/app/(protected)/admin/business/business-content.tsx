import { redirect } from "next/navigation";

import { ProtectedPageToolbar } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import type { BusinessProps } from "@/app/(protected)/_components/shared/common.types";

import { BusinessStats } from "@/app/(protected)/_components/admin/business/stats";
import { BusinessTable } from "@/app/(protected)/_components/admin/business/table";
import {
  businessListQuery,
  type BusinessSearchMeta,
  type PageSearchParams,
} from "@/app/(protected)/_components/admin/business/lib/server-table";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError } from "@/lib/access-error";

import { BusinessActions } from "./page-actions";

interface BusinessContentProps {
  searchParams: PageSearchParams;
  token: string;
}

/** The RSC tags the list is fetched with; the write actions revalidate them. */
const BUSINESS_LIST_TAGS = [
  "create-business",
  "delete-business",
  "update-business",
  "toggle-business-active",
];

const firstParam = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

/**
 * Empresas (/admin). The cards, the status and UF filters and the order are
 * the API's over every company (decision 8.8): the old screen counted "Com
 * código ERP", "Por Estado" and "Por Cidade" on the ten rows of the page.
 */
const BusinessContent = async ({
  searchParams,
  token,
}: BusinessContentProps): Promise<JSX.Element> => {
  const page = Number(firstParam(searchParams.page)) || 1;
  const pageSize = Number(firstParam(searchParams.pageSize)) || 10;
  const search = firstParam(searchParams.search) || "";

  let responseError = { error: false, errorMessage: "" };
  let business: BusinessProps[] = [];
  let meta = { total: 0, page, pageSize };
  let searchMeta: BusinessSearchMeta | undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    ...businessListQuery(searchParams),
  });

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/business/list-business?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: BUSINESS_LIST_TAGS },
      },
    );
  } catch {
    responseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de empresas",
    };
  }

  if (response) {
    if (response.status === 401) redirect("/login");

    // A 403 says which refusal it is (decision 4.1), never a generic error.
    const refusal = await readAccessError(response);

    if (refusal) {
      return (
        <div className="my-6 space-y-6">
          <ProtectedPageToolbar />

          <AccessErrorState
            kind={refusal.kind}
            audience="master"
            message={refusal.message}
          />
        </div>
      );
    }

    if (!response.ok) {
      responseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de empresas",
      };
    } else {
      const { meta: parsedMeta, data } = await parseNDJSON(response);

      business = data;
      meta = parsedMeta ?? { total: data.length, page, pageSize };
      searchMeta = parsedMeta?.searchMeta;
    }
  }

  return (
    <div className="my-6 space-y-6">
      <ProtectedPageToolbar actions={<BusinessActions />} />

      <BusinessStats searchMeta={searchMeta} />

      <BusinessTable
        data={business}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta}
      />
    </div>
  );
};

export { BusinessContent };
