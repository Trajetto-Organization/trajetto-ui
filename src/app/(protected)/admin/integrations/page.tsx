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
      Chaves de API, endpoints de webhook e o monitor de envios das
      empresas atendidas.`,
  };
}

const AdminIntegrations = async ({
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
        description="Selecione a empresa para emitir chaves, apontar webhooks e acompanhar o que foi entregue aos sistemas dela."
      />

      <Suspense fallback={<ProtectedTableContentLoading />}>
        <IntegrationsContent mode="admin" searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
};

export default AdminIntegrations;
