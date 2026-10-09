import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { BackButton } from "@/app/(protected)/_components/driver/back-button";
import { DriverAccountPayableList } from "@/features/account-payable/driver-list";

import { getCookies } from "@/actions/cookies";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Minhas Contas a Pagar",
    description: "As contas a pagar em que você é o responsável.",
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
        description="As contas em que você é o responsável, com a situação de cada uma."
      />

      <DriverAccountPayableList />
    </PageContainer>
  );
};

export default DriverAccountPayable;
