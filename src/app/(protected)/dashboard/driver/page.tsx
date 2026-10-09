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
    description: `
      Gerencie facilmente seus motoristas cadastrados. Consulte, edite e
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const DashboardDriver = async ({
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
        description="Gerencie os motoristas cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <Suspense fallback={<DriverSkeleton mode="dashboard" />}>
        <DriverContent
          mode="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardDriver;
