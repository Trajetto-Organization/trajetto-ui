import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { DriverAccountPayableList } from "@/app/(protected)/_components/driver/account-payable";
import { BackButton } from "@/app/(protected)/_components/driver/back-button";

import { getCookies } from "@/actions/cookies";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Minhas Contas a Pagar",
    description: "Visualize suas contas a pagar e obrigações financeiras",
  };
}

const DriverAccountPayable = async (): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <BackButton title="Voltar" />

      <ProtectedHeading
        title="Minhas Contas a Pagar"
        description="Visualize o histórico completo de suas obrigações financeiras"
      />

      <DriverAccountPayableList />
    </PageContainer>
  );
};

export default DriverAccountPayable;
