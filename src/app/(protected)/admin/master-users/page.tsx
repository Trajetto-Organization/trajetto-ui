import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { MasterUserContent } from "@/features/user/master-content";
import { ListSkeleton } from "@/features/user/skeleton";

interface MasterUsersPageProps {
  // Every param the URL carries: page, search, sort, order and the filters.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Usuários Masters",
    description:
      "Gerencie os usuários Master da plataforma: crie, edite, revogue o acesso e envie o link de definição de senha.",
  };
}

const MasterUsers = async ({
  searchParams,
}: MasterUsersPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Usuários Masters"
        description="Gerencie os usuários Masters da plataforma"
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the async content, so the heading paints at once. No company
          selector: masters belong to the platform, not to a company. */}
      <Suspense
        fallback={
          <ListSkeleton scope="admin" selector={false} cards={4} filters={2} />
        }
      >
        <MasterUserContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default MasterUsers;
