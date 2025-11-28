"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { KanbanBoard } from "../board";
import { CreateColumnModal } from "../column/create-column-modal";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Loader, Loader2, Plus, Search, X } from "lucide-react";
import { debounce } from "lodash";

import { BusinessSelector } from "../business-selector";
import { useKanbanInfiniteScroll } from "./hooks/kanban-infinite-scroll";

import { KanbanEmptyState } from "../empty-state";
import { formatKanbanResults } from "./helpers";

import { KanbanBoardSkeleton } from "../board-skeleton";
import { KanbanRevalidationButton } from "../revalidate-button";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { useAuthStore } from "@/store/auth-store";
import { KanbanBoardProviderProps } from "./dto";

const KanbanBoardProvider = ({
  businessId: businessIdProp,
  initialSearch = "",
  showBusinessSelector = true,
  mode = "admin",
}: KanbanBoardProviderProps): JSX.Element => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get businessId from auth store if not provided via props (for dashboard mode)
  const storeBusinessId = useAuthStore((state) => state.businessId);
  const businessId = businessIdProp || storeBusinessId || undefined;

  const [searchValue, setSearchValue] = useState(initialSearch);
  const [debouncedSearchValue, setDebouncedSearchValue] =
    useState(initialSearch);

  const [isSearchPending, setIsSearchPending] = useState<boolean>(false);
  const [isCreateColumnModalOpen, setIsCreateColumnModalOpen] =
    useState<boolean>(false);

  const hasUserPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "write",
  );

  const hasUserReadPermission = useHasPermission(
    permissions.KANBAN_MANAGE,
    "read",
  );

  // Determines if the user has limited access (only their own cards)
  const hasLimitedAccess = !hasUserReadPermission;

  const {
    columns,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    refetch,
    hasNextPage,
    totalColumns,
    hasSearchResults,
    isSearching,
  } = useKanbanInfiniteScroll(businessId, debouncedSearchValue);

  const handleOpenColumnModal = () => {
    setIsCreateColumnModalOpen(!isCreateColumnModalOpen);
  };

  const updateUrlWithBusinessId = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Only manage businessId in URL if we are in admin mode
      if (mode === "admin") {
        const currentBusinessId = searchParams.get("businessId") || businessId;
        if (currentBusinessId) {
          params.set("businessId", currentBusinessId);
        }
      }

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`?${params.toString()}`);
    },
    [searchParams, businessId, router, mode],
  );

  const debouncedSearch = useRef<ReturnType<typeof debounce>>();

  useEffect(() => {
    // Clear previous debounce if exists
    if (debouncedSearch.current) {
      debouncedSearch.current.cancel();
    }

    // Create new debounce with updated function
    debouncedSearch.current = debounce((searchTerm: string) => {
      setDebouncedSearchValue(searchTerm);
      updateUrlWithBusinessId({
        search: searchTerm || null,
        page: "1",
      });
    }, 500);

    // Cleanup
    return () => {
      if (debouncedSearch.current) {
        debouncedSearch.current.cancel();
      }
    };
  }, [updateUrlWithBusinessId]);

  const handleSearch = (term: string) => {
    setSearchValue(term);
    setIsSearchPending(true);
    if (debouncedSearch.current) {
      debouncedSearch.current(term);
    }
  };

  const handleSearchChange = (newSearch: string) => {
    setSearchValue(newSearch);
    setDebouncedSearchValue(newSearch);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setDebouncedSearchValue("");

    updateUrlWithBusinessId({
      search: null,
      page: "1",
    });
  };

  // Sync search value with URL whenever searchParams changes
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch !== searchValue) {
      setSearchValue(urlSearch);
      setDebouncedSearchValue(urlSearch);
    }
  }, [searchParams]);

  // Clear search pending state when fetching completes
  useEffect(() => {
    if (!isFetching && !isLoading) {
      setIsSearchPending(false);
    }
  }, [isFetching, isLoading]);

  // Check if businessId is not set (only relevant for admin mode)
  if (mode === "admin" && !businessId) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {showBusinessSelector && (
            <BusinessSelector currentBusinessId={businessId} />
          )}
        </div>
        <div
          className="flex items-center justify-center 
          h-96 rounded-lg border-2 border-dashed"
        >
          <p className="text-muted-foreground text-center">
            Selecione uma empresa para visualizar seu board Kanban
          </p>
        </div>
      </div>
    );
  }

  // Check if user doesn't have businessId in dashboard mode
  if (mode === "dashboard" && !businessId) {
    return (
      <div className="space-y-4">
        <div
          className="flex items-center justify-center 
          h-96 rounded-lg border-2 border-dashed"
        >
          <p className="text-muted-foreground text-center">
            Usuário não possui uma empresa associada. Entre em contato com o
            administrador.
          </p>
        </div>
      </div>
    );
  }

  // Error state keeps controls visible
  if (hasError) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {showBusinessSelector && mode === "admin" && (
            <BusinessSelector currentBusinessId={businessId} />
          )}
          <div className="w-full sm:max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform 
                -translate-y-1/2 text-muted-foreground h-4 w-4"
              />
              <Input
                id="kanban-search"
                name="kanban-search"
                type="text"
                placeholder="Buscar por ID, coluna, card, usuário ou prioridade..."
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10 w-full"
              />
              {isSearchPending && (
                <div
                  className="absolute right-3 top-1/2
                  -translate-y-1/2 pointer-events-none"
                >
                  <Loader2
                    className="h-4 w-4 animate-spin
                    text-muted-foreground"
                  />
                </div>
              )}
              {searchValue && !isSearchPending && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2
                  transform -translate-y-1/2 h-6 w-6"
                  onClick={handleClearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-96">
          <p className="text-destructive">
            {errorMessage || "Erro ao carregar board"}
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <KanbanRevalidationButton
            businessId={businessId}
            rateLimit={{
              storageKey: "kanban-revalidation-error",
              maxClicks: 3,
              timeWindowMs: 30000,
              cooldownTimeMs: 15000,
            }}
          />
          <Button onClick={() => refetch()}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {showBusinessSelector && mode === "admin" && (
          <BusinessSelector currentBusinessId={businessId} />
        )}
        <div className="w-full sm:max-w-md flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 transform 
              -translate-y-1/2 text-muted-foreground h-4 w-4"
            />
            <Input
              id="kanban-search-main"
              name="kanban-search-main"
              type="text"
              placeholder={
                hasLimitedAccess
                  ? "Buscar seus cards por ID, título ou usuário..."
                  : "Buscar por ID, coluna, card ou usuário..."
              }
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 w-full"
              disabled={isLoading && !columns}
            />
            {isSearchPending && (
              <div
                className="absolute right-3 top-1/2
                -translate-y-1/2 pointer-events-none"
              >
                <Loader2
                  className="h-4 w-4 animate-spin
                  text-muted-foreground"
                />
              </div>
            )}
            {searchValue && !isSearchPending && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1
                top-1/2 transform -translate-y-1/2
                h-6 w-6"
                onClick={handleClearSearch}
                disabled={isLoading && !columns}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {!(isLoading && !columns) && !hasLimitedAccess && (
          <div
            className="w-full sm:w-auto 
            sm:ml-auto flex justify-end gap-2"
          >
            <KanbanRevalidationButton
              businessId={businessId}
              rateLimit={{
                storageKey: "kanban-revalidation",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
            <Button
              variant="outline"
              className="w-full sm:w-44 
              h-10 border-dashed"
              onClick={handleOpenColumnModal}
              disabled={!hasUserPermission}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Coluna
            </Button>
          </div>
        )}
      </div>

      {(searchValue || totalColumns > 0) && !(isLoading && !columns) && (
        <div className="mt-2 space-y-2">
          <div
            className="text-sm text-muted-foreground 
            line-clamp-2"
          >
            {searchValue ? (
              <>
                Mostrando resultados para &quot;
                <span className="font-medium">{searchValue}</span>&quot;
                {totalColumns > 0 && (
                  <> ({formatKanbanResults(totalColumns, searchValue)})</>
                )}
                {totalColumns === 0 && (
                  <> ({formatKanbanResults(0, searchValue)})</>
                )}
              </>
            ) : (
              formatKanbanResults(totalColumns)
            )}
          </div>

          {/* Limited access indicator */}
          {hasLimitedAccess && (
            <div
              className="text-xs text-amber-600 bg-amber-50 
              dark:bg-amber-950/20 px-3 py-2 rounded-md border 
              border-amber-200 dark:border-amber-800"
            >
              <span className="font-medium">Visualização limitada:</span> Você
              está vendo apenas os cards atribuídos a você.
            </div>
          )}
        </div>
      )}

      {isLoading && !columns ? (
        <div
          className="flex items-center
          justify-center h-96"
        >
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      ) : isSearchPending ? (
        <KanbanBoardSkeleton />
      ) : hasSearchResults ? (
        <div className="h-[calc(100vh-20rem)]">
          <KanbanBoard
            key={`${businessId}-${debouncedSearchValue}`}
            board={{
              id: businessId!,
              name: "Kanban da Empresa",
              isDefault: true,
              businessId: businessId!,
              columns: columns || [],
              labels: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }}
            hasMore={hasNextPage || false}
            loading={isFetching}
            lastElementRef={lastElementRef}
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-center 
          h-96 rounded-lg border-2 border-dashed"
        >
          <KanbanEmptyState
            searchQuery={isSearching ? debouncedSearchValue : undefined}
            businessId={businessId}
            onOpenColumnModal={handleOpenColumnModal}
            onSearchChange={handleSearchChange}
            updateUrl={updateUrlWithBusinessId}
            hasLimitedAccess={hasLimitedAccess}
          />
        </div>
      )}
      {isCreateColumnModalOpen && businessId && !hasLimitedAccess && (
        <CreateColumnModal
          isOpen={isCreateColumnModalOpen}
          onClose={handleOpenColumnModal}
          boardId={businessId}
        />
      )}
    </div>
  );
};

export { KanbanBoardProvider };
