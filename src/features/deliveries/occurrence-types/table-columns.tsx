"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { displayValue, formatNotificationDate } from "@/lib/format-values";

import type { OccurrenceTypeData } from "@/actions/occurrence-type/list-occurrence-type";
import { OccurrenceTypeRowActions } from "./row-actions";
import { readFormFields } from "./form-builder/rules";
import { categoryBadgeOf, requirementsOf } from "./category-display";

/** Questions in a stored form; a form that no longer parses counts as none. */
const formQuestionCount = (stored: unknown): number =>
  readFormFields(stored)?.length ?? 0;

const buildOccurrenceTypeColumns = (): ColumnDef<OccurrenceTypeData>[] => [
  {
    accessorKey: "name",
    meta: { title: "Nome" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => (
      <div className="flex w-56 items-center gap-2">
        <p className="truncate font-medium">
          {displayValue(row.getValue("name"))}
        </p>
        {/* Decision 14.3: the platform's defaults are editable, never deleted. */}
        {row.original.is_default && (
          <Badge variant="outline" className="shrink-0">
            Padrão
          </Badge>
        )}
      </div>
    ),
    // The name is the type's identifier: unique per company, what the
    // driver picks in the app.
    enableHiding: false,
  },
  {
    // Decision 14.3: Entrega / Não entrega / Pausa (server facet `category`).
    id: "category",
    accessorFn: (row) => row.category ?? "NOT_DELIVERED",
    meta: { title: "Categoria" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
    cell: ({ row }) => {
      const badge = categoryBadgeOf(row.original.category);

      return (
        <Badge variant="outline" className={badge.className}>
          {badge.label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: false,
  },
  {
    // What the driver must send, or the legal nature of a pause.
    id: "requirements",
    accessorFn: (row) => requirementsOf(row).join(", "),
    meta: { title: "Exigências" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Exigências" />
    ),
    cell: ({ row }) => {
      const items = requirementsOf(row.original);

      return (
        <p className="w-56 truncate font-medium" title={items.join(", ")}>
          {items.length === 0 ? "Nenhuma" : items.join(", ")}
        </p>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "description",
    meta: { title: "Descrição" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-72">
        {displayValue(row.getValue("description"))}
      </p>
    ),
    enableSorting: false,
  },
  {
    id: "blocks_delivery",
    accessorFn: (row) => (row.blocks_delivery ? "Sim" : "Não"),
    meta: { title: "Impeditiva" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Impeditiva" />
    ),
    cell: ({ row }) =>
      row.original.blocks_delivery ? (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 border-red-200"
        >
          Sim
        </Badge>
      ) : (
        <Badge variant="outline">Não</Badge>
      ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "requires_photo",
    accessorFn: (row) => (row.requires_photo ? "Obrigatória" : "Opcional"),
    meta: { title: "Foto" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Foto" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-28">
        {row.original.requires_photo ? "Obrigatória" : "Opcional"}
      </p>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: false,
  },
  {
    // Decision 6.3: the driver's report waits for the tower.
    id: "requires_authorization",
    accessorFn: (row) => (row.requires_authorization ? "Torre" : "Não"),
    meta: { title: "Autorização" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Autorização" />
    ),
    cell: ({ row }) =>
      row.original.requires_authorization ? (
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-900 border-amber-200"
        >
          Exige torre
        </Badge>
      ) : (
        <Badge variant="outline">Não</Badge>
      ),
    enableSorting: false,
  },
  {
    // Decision 6.2: how many questions the driver answers.
    id: "form_fields",
    accessorFn: (row) => formQuestionCount(row.form_fields),
    meta: { title: "Formulário" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Formulário" />
    ),
    cell: ({ row }) => {
      const count = formQuestionCount(row.original.form_fields);

      return (
        <p className="truncate font-medium w-32">
          {count === 0
            ? "Sem formulário"
            : `${count} ${count === 1 ? "pergunta" : "perguntas"}`}
        </p>
      );
    },
    enableSorting: false,
  },
  {
    id: "is_active",
    accessorFn: (row) => (row.is_active ? "Ativo" : "Inativo"),
    meta: { title: "Status" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.is_active
            ? "bg-green-100 text-green-800 border-green-200"
            : "bg-gray-100 text-gray-500 border-gray-200"
        }
      >
        {row.original.is_active ? "Ativo" : "Inativo"}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "created_at",
    meta: {
      title: "Criação",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de criação" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(
          formatNotificationDate(row.getValue("created_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    accessorKey: "updated_at",
    meta: {
      title: "Atualização",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de atualização" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(
          formatNotificationDate(row.getValue("updated_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    id: "Ações",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <OccurrenceTypeRowActions row={row} />,
  },
];

export { buildOccurrenceTypeColumns };
