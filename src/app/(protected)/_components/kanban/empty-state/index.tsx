"use client";

import { Search, Kanban, Filter, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import type { KanbanEmptyStateProps } from "./empty-state.types";

const KanbanEmptyState = ({
  searchQuery,
  businessId,
  onOpenColumnModal,
  onSearchChange,
  updateUrl,
  hasLimitedAccess = false,
}: KanbanEmptyStateProps): JSX.Element => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasUserPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "write",
  );

  const clearSearch = () => {
    if (updateUrl) {
      updateUrl({
        search: null,
        page: "1",
      });
    } else {
      const params = new URLSearchParams(searchParams.toString());

      if (businessId && !params.has("businessId")) {
        params.set("businessId", businessId);
      }

      params.delete("search");
      params.set("page", "1");

      router.push(`?${params.toString()}`);
    }

    if (onSearchChange) {
      onSearchChange("");
    }
  };

  return (
    <div
      className="flex flex-col items-center 
      justify-center py-24 px-4"
    >
      <div className="animate-fade-up [animation-delay:100ms] relative mb-6 sm:mb-8">
        <div
          className="absolute inset-0 bg-gradient-to-r 
         from-purple-500/20 via-pink-500/20 
         to-blue-500/20 blur-xl sm:blur-2xl md:blur-3xl"
        />
        <div className="animate-wiggle relative">
          {searchQuery ? (
            <Search
              className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 
              md:h-20 lg:w-24 lg:h-24 text-muted-foreground/50"
            />
          ) : (
            <Kanban
              className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 
              md:h-20 lg:w-24 lg:h-24 text-muted-foreground/50"
            />
          )}
        </div>
      </div>

      <h3
        className="animate-fade-up [animation-delay:200ms] text-base sm:text-lg md:text-xl 
        lg:text-2xl font-bold text-center 
        mb-2 sm:mb-3 px-2"
      >
        {searchQuery
          ? "Nenhum resultado encontrado"
          : hasLimitedAccess
            ? "Nenhum card atribuído"
            : "Nenhuma coluna disponível"}
      </h3>

      <p
        className="animate-fade-up [animation-delay:300ms] text-muted-foreground text-center max-w-xs 
        sm:max-w-sm md:max-w-md lg:max-w-lg mb-6 sm:mb-8 
        text-xs sm:text-sm md:text-base px-2"
      >
        {searchQuery ? (
          <>
            Não encontramos colunas ou cards que correspondam à sua busca por{" "}
            <span className="font-semibold break-words">
              &quot;{searchQuery}&quot;
            </span>
            {hasLimitedAccess && (
              <>
                <br className="hidden sm:block" />
                <span
                  className="text-xs sm:text-sm block 
                  sm:inline mt-2 sm:mt-0 text-amber-600"
                >
                  Nota: Você está visualizando apenas cards atribuídos a você.
                </span>
              </>
            )}
            .
          </>
        ) : (
          <>
            {!hasLimitedAccess ? (
              <>
                Este board ainda não possui colunas criadas.
                <br className="hidden sm:block" />
                <span
                  className="text-xs sm:text-sm block 
                  sm:inline mt-1 sm:mt-0"
                >
                  Comece criando sua primeira coluna para organizar suas
                  tarefas!
                </span>
              </>
            ) : (
              <>
                Você não possui cards atribuídos.
                <br className="hidden sm:block" />
                <span
                  className="text-xs sm:text-sm block 
                  sm:inline mt-1 sm:mt-0 text-amber-600"
                >
                  Você está visualizando apenas cards atribuídos a você.
                </span>
              </>
            )}
          </>
        )}
      </p>

      <div
        className="animate-fade-up [animation-delay:400ms] flex flex-col 
        sm:flex-row gap-4"
      >
        {searchQuery ? (
          <>
            <Button
              onClick={clearSearch}
              variant="default"
              className="rounded-full"
            >
              <Filter className="mr-2 h-4 w-4" />
              Limpar busca
            </Button>
            {onOpenColumnModal && !hasLimitedAccess && (
              <Button
                onClick={onOpenColumnModal}
                variant="outline"
                className="rounded-full"
                disabled={!hasUserPermission}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar coluna
              </Button>
            )}
          </>
        ) : (
          <>
            {!hasLimitedAccess && (
              <Button
                onClick={onOpenColumnModal}
                variant="default"
                className="rounded-full"
                disabled={!businessId || !hasUserPermission}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira coluna
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export { KanbanEmptyState };
