import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { DriverContent } from "@/features/driver/content";
import { DriverSkeleton } from "@/features/driver/skeleton";

interface DriverQueryParamsProps {
  // Every param the URL carries: page, search, sort, order and the filters.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Motoristas",
    description:
      "Consulte, cadastre, edite e exporte os motoristas de qualquer empresa da plataforma.",
  };
}

const AdminDriver = async ({
  searchParams,
}: DriverQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Motoristas"}
        description="Selecione uma empresa para gerenciar os motoristas dela: dados pessoais, CNH, filial e situação."
      />

      <Suspense fallback={<DriverSkeleton mode="admin" />}>
        <DriverContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminDriver;
