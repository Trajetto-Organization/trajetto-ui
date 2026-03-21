"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { serviceOrderPartTableSchema } from "@/schemas/service-order-part-table-schema";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import {
  displayValue,
  formatDate,
  formatToBrazilianCurrency,
  formatNotificationDate,
} from "@/lib/format-values";
import { DataTableServiceOrderPartRowActions } from "../data-table-row-actions";

const tableServiceOrderPartCollumns: ColumnDef<serviceOrderPartTableSchema>[] =
  [
    {
      id: "select",
      meta: {
        title: "Seleção",
      },
      header: ({ table }) => (
        <Checkbox
          id="select-all-service-order-parts"
          name="select-all-service-order-parts"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          id={`select-service-order-part-${row.id}`}
          name={`select-service-order-part-${row.id}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "id",
      meta: {
        title: "Identificador",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Identificador" />
      ),
      cell: ({ row }) => (
        <p className="truncate font-medium w-72">
          {displayValue(row.getValue("id"))}
        </p>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "unit_price",
      meta: {
        title: "Preço unitário",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Preço unitário" />
      ),
      cell: ({ row }) => {
        const unitPrice = row.getValue("unit_price");
        return (
          <p className="truncate font-medium w-44">
            {displayValue(formatToBrazilianCurrency(Number(unitPrice)))}
          </p>
        );
      },
    },
    {
      accessorKey: "quantity",
      meta: {
        title: "Quantidade",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quantidade" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-44">
            {displayValue(row.getValue("quantity"))}
          </p>
        );
      },
    },
    {
      accessorKey: "discount_percentage",
      meta: {
        title: "Porcentagem do disconto",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Porcentagem do disconto"
        />
      ),
      cell: ({ row }) => {
        const discountPercentage = row.getValue("discount_percentage");
        return (
          <p className=" truncate font-medium w-24">
            {displayValue(
              discountPercentage != null
                ? `${Number(discountPercentage)}%`
                : "0%",
            )}
          </p>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "businessId",
      meta: {
        title: "Identificador da empresa",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Identificador da empresa"
        />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-28">
            {displayValue(row.getValue("businessId"))}
          </p>
        );
      },
    },
    {
      accessorKey: "businessName",
      accessorFn: (row) => row.business?.corporate_reason,
      meta: {
        title: "Nome da empresa",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome da empresa" />
      ),
      cell: ({ row }) => {
        const businessName = row.original.business?.corporate_reason;
        return (
          <p className="truncate font-medium w-48">
            {displayValue(businessName)}
          </p>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "serviceOrderId",
      meta: {
        title: "Identificador da ordem de serviço",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Identificador da ordem de serviço"
        />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-48">
            {displayValue(row.getValue("serviceOrderId"))}
          </p>
        );
      },
    },
    {
      accessorKey: "serviceOrderDate",
      accessorFn: (row) => row.serviceOrder?.date,
      meta: {
        title: "Data da ordem de serviço",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Data da ordem de serviço"
        />
      ),
      cell: ({ row }) => {
        const serviceOrderDate = row.original.serviceOrder?.date;
        return (
          <p className="truncate font-medium w-44">
            {displayValue(formatDate(serviceOrderDate, "pt-BR"))}
          </p>
        );
      },
    },
    {
      accessorKey: "vehicleLicensePlate",
      accessorFn: (row) => row.serviceOrder?.vehicle?.license_plate,
      meta: {
        title: "Placa do veículo",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Placa do veículo" />
      ),
      cell: ({ row }) => {
        const licensePlate = row.original.serviceOrder?.vehicle?.license_plate;
        return (
          <p className="truncate font-medium w-28">
            {displayValue(licensePlate)}
          </p>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "vehicleDescription",
      accessorFn: (row) => row.serviceOrder?.vehicle?.description,
      meta: {
        title: "Descrição do veículo",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrição do veículo" />
      ),
      cell: ({ row }) => {
        const vehicleDescription =
          row.original.serviceOrder?.vehicle?.description;
        return (
          <p className="truncate font-medium w-48">
            {displayValue(vehicleDescription)}
          </p>
        );
      },
    },
    {
      accessorKey: "partId",
      meta: {
        title: "Identificador da peça",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Identificador da peça" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-48">
            {displayValue(row.getValue("partId"))}
          </p>
        );
      },
    },
    {
      accessorKey: "partDescription",
      accessorFn: (row) => row.part?.description,
      meta: {
        title: "Descrição da peça",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrição da peça" />
      ),
      cell: ({ row }) => {
        const partDescription = row.original.part?.description;
        return (
          <p className="truncate font-medium w-44">
            {displayValue(partDescription)}
          </p>
        );
      },
    },
    {
      accessorKey: "partUnitPrice",
      accessorFn: (row) => row.part?.unit_price,
      meta: {
        title: "Preço unitário da peça",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Preço unitário da peça" />
      ),
      cell: ({ row }) => {
        const partUnitPrice = row.original.part?.unit_price;
        return (
          <p className="truncate font-medium w-32">
            {displayValue(formatToBrazilianCurrency(Number(partUnitPrice)))}
          </p>
        );
      },
    },
    {
      accessorKey: "totalPrice",
      accessorFn: (row) => {
        const unitPrice = Number(row.unit_price);
        const quantity = row.quantity;

        return unitPrice * quantity;
      },
      meta: {
        title: "Preço total",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Preço total" />
      ),
      cell: ({ row }) => {
        const unitPrice = Number(row.original.unit_price);

        const quantity = row.original.quantity;
        const totalPrice = unitPrice * quantity;

        return (
          <p className="truncate font-medium w-32">
            {displayValue(formatToBrazilianCurrency(totalPrice))}
          </p>
        );
      },
    },
    {
      accessorKey: "totalWithDiscount",
      accessorFn: (row) => {
        const unitPrice = Number(row.unit_price);
        const quantity = row.quantity;

        const discountPercentage = Number(row.discount_percentage || 0);
        const totalPrice = unitPrice * quantity;

        const discountAmount = totalPrice * (discountPercentage / 100);
        return totalPrice - discountAmount;
      },
      meta: {
        title: "Preço total com desconto",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Preço total com desconto"
        />
      ),
      cell: ({ row }) => {
        const unitPrice = Number(row.original.unit_price);
        const quantity = row.original.quantity;

        const discountPercentage = Number(
          row.original.discount_percentage || 0,
        );
        const totalPrice = unitPrice * quantity;

        const discountAmount = totalPrice * (discountPercentage / 100);
        const totalWithDiscount = totalPrice - discountAmount;

        return (
          <p className="truncate font-medium w-32">
            {displayValue(formatToBrazilianCurrency(totalWithDiscount))}
          </p>
        );
      },
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
      cell: ({ row }) => <DataTableServiceOrderPartRowActions row={row} />,
    },
  ];

export { tableServiceOrderPartCollumns };
