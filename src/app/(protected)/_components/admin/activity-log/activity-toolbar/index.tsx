"use client";

import { Table } from "@tanstack/react-table";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit,
  Plus,
  Trash2,
  User,
  X,
  Ban,
  Car,
  PackageCheck,
  BookUser,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableFacetedFilter } from "@/app/(protected)/_components/shared/tanstack-table/data-table-faceted-filter";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";

import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export function ActivityToolbar<TData>({
  table,
  error,
  isLoading,
  setIsLoading,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();
  const isFiltered = table.getState().columnFilters.length > 0;

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  const filters = [
    {
      key: "business_name",
      title: "Nome da Empresa",
      dynamicOptionIcon: BookUser,
    },
    {
      key: "type",
      title: "Tipo",
      dynamicOptionIcon: Activity,
    },
    {
      key: "action",
      title: "Ação",
      options: [
        { value: "create", label: "Criar", icon: Plus },
        { value: "update", label: "Atualizar", icon: Edit },
        { value: "delete", label: "Deletar", icon: Trash2 },
      ],
    },
    {
      key: "status",
      title: "Status",
      options: [
        { value: "Ativo", label: "Ativo", icon: CheckCircle2 },
        { value: "Inativo", label: "Inativo", icon: Ban },
        { value: "Bloqueado", label: "Bloqueado", icon: AlertCircle },
        { value: "Em Rota", label: "Em Rota", icon: Car },
        { value: "Completo", label: "Completo", icon: PackageCheck },
        { value: "Pendente", label: "Pendente", icon: Clock },
        { value: "Atualizado", label: "Atualizado", icon: Edit },
        { value: "Deletado", label: "Deletado", icon: Trash2 },
        { value: "Criado", label: "Criado", icon: Plus },
      ],
    },
    {
      key: "userRole",
      title: "Papel do Usuário",
      options: [
        { value: "MASTER", label: "Master", icon: User },
        { value: "BUSINESS_ADMIN", label: "Admin", icon: User },
        { value: "BUSINESS_USER", label: "Colaborador", icon: User },
      ],
    },
  ];

  return (
    <div
      className="flex flex-col sm:flex-row items-start
      sm:items-center justify-between gap-4 w-full"
    >
      <div
        className="flex flex-wrap flex-1 
        items-center gap-2 w-full"
      >
        <SearchInputWithLoading
          placeholder="Procurar atividade..."
          defaultValue={searchParams.get("search") || ""}
          onChange={handleSearchWithLoading}
          disabled={error}
          isLoading={isPending || isLoading}
          wrapperClassName="w-full sm:w-auto
          sm:min-w-[270px] sm:max-w-[270px]"
        />

        {filters.map(({ key, title, options, dynamicOptionIcon }) => {
          const column = table.getColumn(key);
          if (!column) return null;

          return (
            <DataTableFacetedFilter
              key={key}
              column={column}
              title={title}
              options={options}
              dynamicOptionIcon={dynamicOptionIcon}
            />
          );
        })}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3
            flex items-center gap-1"
          >
            Resetar
            <X className="h-4 w-4" />
          </Button>
        )}

        {!error && (
          <div
            className="ml-auto flex flex-col sm:flex-row 
            gap-2 sm:gap-4 w-full sm:w-auto"
          >
            <DataTableRevalidate
              revalidateData="update-activity"
              rateLimit={{
                storageKey: "activity",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
            <DataTableViewOptions table={table} />
          </div>
        )}
      </div>
    </div>
  );
}
