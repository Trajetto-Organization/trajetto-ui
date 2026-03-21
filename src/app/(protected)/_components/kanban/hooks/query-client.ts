import { queryClientProps } from "@/lib/query-client-props";

function useKanbanQueryClient() {
  const invalidateKanbanQueries = async (businessId?: string) => {
    // Invalidate all kanban queries for the specific business
    if (businessId) {
      await queryClientProps.invalidateQueries(["kanban", businessId]);
    } else {
      // Invalidate all kanban queries
      await queryClientProps.invalidateQueries(["kanban"]);
    }
  };

  return {
    invalidateKanbanQueries,
  };
}

export { useKanbanQueryClient };
