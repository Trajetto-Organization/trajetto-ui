import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { PermissionContent } from "@/features/permission/content";
import { ListSkeleton } from "@/features/user/skeleton";

interface PermissionPageProps {
  // Every param the URL carries: page, search, sort, order, the filters.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Permissão de usuário",
    description:
      "Gerencie as permissões dos perfis de acesso: o que cada perfil pode consultar e alterar em cada recurso do sistema.",
  };
}

const DashboardPermission = async ({
  searchParams,
}: PermissionPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Permissão de usuário"
        description="Ajuste o que cada perfil de acesso da sua empresa pode consultar e alterar."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the async content, so the heading paints at once. */}
      <Suspense
        fallback={
          <ListSkeleton scope="dashboard" cards={3} filters={4} columns={8} />
        }
      >
        <PermissionContent
          scope="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardPermission;
