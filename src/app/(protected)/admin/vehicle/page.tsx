import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { VehicleContent } from "@/features/vehicle/content";
import { FleetListSkeleton } from "@/features/vehicle/skeleton";

interface PageProps {
  // Every param Next hands over: the list forwards sort and filters too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Veículos",
    description:
      "Cadastre e acompanhe os veículos da frota: status, quilometragem, revisões e motorista responsável.",
  };
}

const AdminVehicle = async ({
  searchParams,
}: PageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Veículos"
        description="Selecione uma empresa para ver e cadastrar os veículos da frota dela."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the list, so the heading paints at once. */}
      <Suspense
        fallback={<FleetListSkeleton mode="admin" actions={3} withStats />}
      >
        <VehicleContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminVehicle;
