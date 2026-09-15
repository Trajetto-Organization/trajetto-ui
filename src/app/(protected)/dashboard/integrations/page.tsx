import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedTableContentLoading } from "@/app/(protected)/_components/loading-page/protected-table-content-loading";
import { getCookies } from "@/actions/cookies";

import { IntegrationsContent } from "@/features/integrations/content";

interface IntegrationsQueryParamsProps {
  searchParams: {
    tab?: string;
    businessId?: string;
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Integrações",
    description: `
      Chaves de API, endpoints de webhook e o monitor do que foi enviado
      para os sistemas dos seus clientes.`,
  };
}

const DashboardIntegrations = async ({
  searchParams,
}: IntegrationsQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Integrações"}
        description="Emita chaves de API, aponte webhooks para os sistemas dos seus clientes e acompanhe o que foi entregue."
      />

      <Suspense fallback={<ProtectedTableContentLoading />}>
        <IntegrationsContent mode="dashboard" searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardIntegrations;
