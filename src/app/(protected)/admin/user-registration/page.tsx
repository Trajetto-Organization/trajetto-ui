import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { UserContent } from "@/features/user/content";
import { ListSkeleton } from "@/features/user/skeleton";

interface UserRegistrationQueryParamsProps {
  // Every param the URL carries: page, search, sort, order and the filters.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cadastro de usuário",
    description:
      "Gerencie o cadastro de usuários: crie, edite, revogue o acesso e acompanhe a verificação de e-mail e a autenticação em duas etapas.",
  };
}

const AdminUserRegistration = async ({
  searchParams,
}: UserRegistrationQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Cadastro de usuário"
        description="Selecione uma empresa para gerenciar os usuários dela: nível de acesso, perfil ou motorista vinculado e situação do acesso."
      />

      <Suspense fallback={<ListSkeleton scope="admin" cards={4} filters={4} />}>
        <UserContent
          scope="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminUserRegistration;
