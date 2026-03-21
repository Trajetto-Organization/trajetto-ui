import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { UserRegistrationActions } from "./page-actions";
import { UserRegistrationContent } from "./user-registration-content";

interface UserRegistrationQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cadastro de usuário",
    description: `
      Gerencie o cadastro de usuários de forma eficiente. Adicione, edite e
      visualize usuários registrados no sistema com segurança e controle total.`,
  };
}

const UserRegistration = async ({
  searchParams,
}: UserRegistrationQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Cadastro de usuário"}
        description="Gerencie o cadastro de usuários de forma simples e segura"
      />

      <UserRegistrationActions />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <UserRegistrationContent
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default UserRegistration;
