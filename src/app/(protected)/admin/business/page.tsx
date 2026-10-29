import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";
import { BusinessListSkeleton } from "@/app/(protected)/_components/admin/business/skeleton";

import { getCookies } from "@/actions/cookies";

import { BusinessContent } from "./business-content";

interface BusinessPageProps {
  // Every param the URL carries: sort, order and the facets too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Empresas",
    description: `
      Gerencie facilmente suas empresas cadastradas. Consulte, edite e
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Business = async ({
  searchParams,
}: BusinessPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Empresas"}
        description="Gerencie empresas cadastradas, delete, edite e mantenha os dados sempre atualizados."
      />

      <Suspense fallback={<BusinessListSkeleton />}>
        <BusinessContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Business;
