import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedTableContentLoading } from "@/app/(protected)/_components/loading-page/protected-table-content-loading";
import { getCookies } from "@/actions/cookies";

import { PermissionContent } from "./permission-content";

interface PermissionQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Permissão de usuário",
    description: `
      Gerencie de forma segura e intuitiva as permissões de acesso dos usuários.
      Visualize, crie e edite privilégios para manter o controle total do sistema.`,
  };
}

const Permission = async ({
  searchParams,
}: PermissionQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Permissão de usuário"
        description="Visualize e gerencie as permissões de acesso dos usuários do sistema."
      />

      <Suspense fallback={<ProtectedTableContentLoading />}>
        <PermissionContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Permission;
