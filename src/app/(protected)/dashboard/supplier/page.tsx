import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { SupplierContent } from "@/features/supplier/content";
import { SupplierSkeleton } from "@/features/supplier/skeleton";

interface SupplierPageProps {
  // Every param the URL carries: sort, order and the UF filter too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Fornecedores",
    description:
      "Cadastre e acompanhe as oficinas, lojas e prestadores que atendem a frota.",
  };
}

const DashboardSupplier = async ({
  searchParams,
}: SupplierPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Fornecedores"
        description="Controle centralizado de parceiros comerciais. Cadastre, monitore e gerencie seus fornecedores."
      />

      <Suspense fallback={<SupplierSkeleton mode="dashboard" />}>
        <SupplierContent
          mode="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardSupplier;
