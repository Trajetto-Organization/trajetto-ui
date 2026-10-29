import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { VehicleChecklistContent } from "@/features/vehicle-checklist/content";
import { FleetListSkeleton } from "@/features/vehicle/skeleton";

interface PageProps {
  // Every param Next hands over: the list forwards sort and filters too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Checklists Veiculares",
    description:
      "As inspeções dos veículos: condição geral, itens verificados, fotos e quem fez.",
  };
}

const AdminVehicleChecklist = async ({
  searchParams,
}: PageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Checklists Veiculares"
        description="Selecione uma empresa para ver os checklists veiculares dela."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the list, so the heading paints at once. */}
      <Suspense
        fallback={<FleetListSkeleton mode="admin" actions={3} withStats />}
      >
        <VehicleChecklistContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminVehicleChecklist;
