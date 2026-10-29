import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCookies } from "@/actions/cookies";
import { readBusinessIdParam } from "@/lib/business-id-param";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { KanbanBoardProvider } from "@/app/(protected)/_components/kanban/board-provider";

export const metadata: Metadata = {
  title: "Kanban",
  description: `
    Gerencie e monitore os boards Kanban de todas as empresas. 
    Visualize tarefas, acompanhe progresso e mantenha a produtividade das equipes.
  `,
};

interface KanbanProps {
  searchParams: {
    businessId?: string;
    page?: string;
    pageSize?: string;
    search?: string;
  };
}

const Kanban = async ({ searchParams }: KanbanProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <ProtectedHeading
          title="Kanban - Administração"
          description="Monitore e gerencie os boards Kanban de todas as empresas do sistema."
        />

        {/* Keyed by company (decision 2.6): a switch restarts the board's
            local state — an open "Adicionar Coluna" dialog, the search box. */}
        <KanbanBoardProvider
          key={readBusinessIdParam(searchParams.businessId) ?? "none"}
          businessId={readBusinessIdParam(searchParams.businessId)}
          initialSearch={searchParams.search}
          mode="admin"
          showBusinessSelector={true}
        />
      </div>
    </PageContainer>
  );
};

export default Kanban;
