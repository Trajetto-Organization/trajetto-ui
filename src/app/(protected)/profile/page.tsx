import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCookies } from "@/actions/cookies";

import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";
import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";

import { ProtectedProfileContentLoading } from "@/app/(protected)/_components/loading-page/protected-profile-content-loading";
import { ProfileContent } from "./profile-content";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Minha Conta",
    description: `
      Gerencie sua conta, configure preferências, atualize sua senha,
      habilite a autenticação de dois fatores, configure notificações
      e personalize seu perfil para uma experiência mais segura.
    `,
  };
}

const Profile = async (): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Meu Perfil"
        description="Gerencie sua conta e configurações"
      />

      <Suspense fallback={<ProtectedProfileContentLoading />}>
        <ProfileContent token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Profile;
