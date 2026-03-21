import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCookies } from "@/actions/cookies";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { KanbanBoardProvider } from "@/app/(protected)/_components/kanban/board-provider";
import { BackButton } from "@/app/(protected)/_components/driver/back-button";

export const metadata: Metadata = {
  title: "Kanban",
  description: `
    Organize e gerencie tarefas com um sistema Kanban intuitivo. 
    Arraste e solte para mover tarefas entre colunas e aumente sua produtividade.
  `,
};

const DriverKanban = async () => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <BackButton title="Voltar" />

      <div className="space-y-4">
        <ProtectedHeading
          title="Kanban"
          description="Monitore e gerencie os boards Kanban de todas as empresas do sistema."
        />

        <KanbanBoardProvider mode="dashboard" showBusinessSelector={false} />
      </div>
    </PageContainer>
  );
};

export default DriverKanban;
