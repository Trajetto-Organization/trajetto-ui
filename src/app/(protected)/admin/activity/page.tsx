import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedTableContentLoading } from "@/app/(protected)/_components/loading-page/protected-table-content-loading";
import { getCookies } from "@/actions/cookies";

import { ActivityContent } from "./activity-content";

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

  return (
    <PageContainer>
      <ProtectedHeading
        title="Registro de Atividades"
        description="Visualize e monitore todas as atividades realizadas no sistema"
      />

      <Suspense fallback={<ProtectedTableContentLoading />}>
        <ActivityContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Activity;
