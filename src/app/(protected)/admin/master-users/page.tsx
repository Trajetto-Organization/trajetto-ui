import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { MasterUsersActions } from "./page-actions";
import { MasterUsersContent } from "./master-users-content";

interface MasterUsersQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Usuários Masters",
    description: `
      Gerencie os usuários Master do sistema. Adicione, edite e
      visualize usuários Master com controle total sobre a plataforma.`,
  };
}

const MasterUsers = async ({
  searchParams,
}: MasterUsersQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Usuários Masters"}
        description="Gerencie os usuários Masters da plataforma"
      />

      <MasterUsersActions />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <MasterUsersContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default MasterUsers;
