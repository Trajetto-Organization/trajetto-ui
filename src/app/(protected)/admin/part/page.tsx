import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { PartContent } from "@/features/part/content";
import { MaintenanceListSkeleton } from "@/features/service-order/skeleton";

interface PageProps {
  // Every param the URL carries: sort, order and the server-side filters too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Peças",
    description: "Catálogo de peças da frota, com preço unitário e fornecedor.",
  };
}

const AdminPart = async ({ searchParams }: PageProps): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Peças"
        description="Escolha a empresa acima para ver e manter o catálogo de peças dela."
      />

      {/* loading.tsx covers the navigation; this covers only the async
          content, so the heading paints first. */}
      <Suspense
        fallback={
          <MaintenanceListSkeleton mode="admin" actions={2} filters={1} />
        }
      >
        <PartContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminPart;
