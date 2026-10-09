import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { ServiceOrderContent } from "@/features/service-order/content";
import { MaintenanceListSkeleton } from "@/features/service-order/skeleton";

interface ServiceOrderPageProps {
  // Every param the URL carries: sort, order and the server-side filters too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Ordens de serviço",
    description:
      "Acompanhe as ordens de serviço da frota de qualquer empresa da plataforma.",
  };
}

const AdminServiceOrder = async ({
  searchParams,
}: ServiceOrderPageProps): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Ordens de serviço"
        description="Escolha a empresa acima para acompanhar as ordens de serviço da frota dela."
      />

      {/* loading.tsx covers the navigation; this covers only the async
          content, so the heading paints first. */}
      <Suspense
        fallback={
          <MaintenanceListSkeleton mode="admin" actions={3} filters={3} />
        }
      >
        <ServiceOrderContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminServiceOrder;
