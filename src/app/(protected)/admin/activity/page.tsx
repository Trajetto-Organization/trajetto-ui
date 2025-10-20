import { createElement } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../../_components/layout/protected-page-container";
import { ProtectedHeading } from "../../_components/layout/protected-heading";

import { DataTable } from "../../_components/tanstack-table/data-table";
import { tableActivityColumns } from "../../_components/admin/activity-log/table-activity-columns";

import { ActivityProps } from "../../_components/admin/activity-log/dto";
import { ActivityToolbar } from "../../_components/admin/activity-log/activity-toolbar";

import { parseNDJSON } from "@/lib/parse-nd-json";
import { getCookies } from "@/actions/cookies";

interface MetaInfo {
  total: number;
  page: number;
  pageSize: number;
}

interface ActivityQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Registro de Atividades",
    description: `
      Visualize e monitore todas as atividades realizadas no sistema.
      Acompanhe criações, edições e exclusões de dados em tempo real.`,
  };
}

const Activity = async ({
  searchParams,
}: ActivityQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

  const search = searchParams.search || "";

  let activityResponseError = {
    error: false,
    errorMessage: "",
  };

  let activity: ActivityProps[] = [];
  let meta: MetaInfo = { total: 0, page: 1, pageSize: 10 };

  let response: Response | undefined;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}/activity/list?page=${page}&pageSize=${pageSize}&search=${search}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: {
          tags: ["update-activity"],
        },
      },
    );
  } catch (error) {
    activityResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar recuperar a lista de atividades",
    };

    activity = [];
    meta = { total: 0, page: 1, pageSize: pageSize };
  }

  if (response) {
    if (!response.ok) {
      if (response.status === 401) {
        redirect("/login");
      }

      activityResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar recuperar a lista de atividades",
      };

      activity = [];
      meta = { total: 0, page: 1, pageSize: pageSize };
    } else {
      // Instead of using response.json(), we process NDJSON
      const { meta: metaParsed, data } = await parseNDJSON(response);

      activity = data;
      meta = metaParsed;
    }
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Registro de Atividades"
        description="Visualize e monitore todas as atividades realizadas no sistema"
      />

      <DataTable
        data={activity}
        meta={meta}
        columns={tableActivityColumns}
        responseError={activityResponseError}
        toolbar={createElement(ActivityToolbar)}
      />
    </PageContainer>
  );
};

export default Activity;
