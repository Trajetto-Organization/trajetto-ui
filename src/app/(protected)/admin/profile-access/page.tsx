import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { ProfileAccessContent } from "@/features/profile-access/content";
import { CatalogListSkeleton } from "@/components/shared/custom/catalog-list-skeleton";
import { readBusinessIdParam } from "@/lib/business-id-param";

interface ProfileAccessPageProps {
  // Every param the URL carries: page, search, sort, order and the
  // company picked at the top.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Perfil de Acesso",
    description:
      "Gerencie os perfis de acesso: crie, renomeie, configure as permissões e veja quantas pessoas usam cada perfil.",
  };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const AdminProfileAccess = async ({
  searchParams,
}: ProfileAccessPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Perfil de acesso"
        description="Selecione uma empresa para gerenciar os perfis de acesso dela: quem usa cada perfil e quais permissões ele concede."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the async content, so the heading paints at once. */}
      <Suspense
        fallback={
          <CatalogListSkeleton
            mode="admin"
            columns={7}
            hasCompany={Boolean(
              readBusinessIdParam(firstParam(searchParams.businessId)),
            )}
          />
        }
      >
        <ProfileAccessContent
          scope="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminProfileAccess;
