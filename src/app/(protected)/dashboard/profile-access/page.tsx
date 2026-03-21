import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedTableContentLoading } from "@/app/(protected)/_components/loading-page/protected-table-content-loading";
import { getCookies } from "@/actions/cookies";

import { ProfileAccessContent } from "./profile-access-content";

interface ProfileAccessQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Perfil de Acesso",
    description: `
    Página para gerenciamento dos perfis de acesso: visualize, edite e
    crie funções para usuários, garantindo segurança e eficiência.`,
  };
}

const ProfileAccess = async ({
  searchParams,
}: ProfileAccessQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Perfil de acesso"}
        description="Gerencie os perfis de acesso do sistema,
        definindo funções e permissões de forma prática e segura."
      />

      <Suspense fallback={<ProtectedTableContentLoading />}>
        <ProfileAccessContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default ProfileAccess;
