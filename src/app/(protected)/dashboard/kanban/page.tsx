import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCookies } from "@/actions/cookies";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { KanbanBoardProvider } from "@/app/(protected)/_components/kanban/board-provider";

export const metadata: Metadata = {
  title: "Kanban",
  description: `
    Organize e gerencie tarefas com um sistema Kanban intuitivo. 
    Arraste e solte para mover tarefas entre colunas e aumente sua produtividade.
  `,
};

const DashboardKanban = async () => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
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

export default DashboardKanban;
