"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import { MoreHorizontal, Trash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ShipperData } from "@/actions/shipper/list-shipper";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { ShipperFormDialog } from "./form-dialog";

import { DeleteShipperDialog } from "./delete-dialog";

interface ShipperRowActionsProps {
  row: Row<ShipperData>;
}

const ShipperRowActions = ({ row }: ShipperRowActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();
  const shipper = row.original;

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Read here rather than as a prop: the hook subscribes to the auth store,
  // so a permission granted or revoked over the socket reaches this row
  // without the table having to rebuild its columns.
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const handleCopyID = () => {
    navigator.clipboard
      .writeText(shipper.id)
      .then(() => toast.success("ID copiado para a área de transferência!"))
      .catch((error) => toast.error("Erro ao copiar o ID: " + error));
  };

  const menuActions = [
    {
      label: "Editar Embarcador",
      onClick: () => {
        setIsDropdownOpen(false);
        setIsEditOpen(true);
      },
      disabled: !permissionsRequired.hasAllPermissions,
      tooltip: permissionsRequired.tooltipMessage,
    },
    {
      label: "Copiar ID",
      onClick: handleCopyID,
      disabled: false,
      tooltip: "",
    },
  ];

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal />
            <span className="sr-only">Abrir Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          {menuActions.map((action) => (
            <TooltipProvider key={action.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem
                      className="cursor-pointer truncate block"
                      onClick={action.onClick}
                      disabled={action.disabled}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                {action.disabled && action.tooltip && (
                  <TooltipContent className="max-w-sm">
                    <p>{action.tooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}

          <DropdownMenuSeparator />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  {/* Same shape as every other module: the word Deletar with
                  the red trash on the right. */}
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center
                    justify-between"
                    disabled={!permissionsRequired.hasAllPermissions}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsDeleteOpen(true);
                    }}
                  >
                    Deletar
                    <Trash
                      size={17}
                      className="dark:text-red-500 text-red-600"
                    />
                  </DropdownMenuItem>
                </div>
              </TooltipTrigger>
              {!permissionsRequired.hasAllPermissions && (
                <TooltipContent className="max-w-sm">
                  <p>{permissionsRequired.tooltipMessage}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DropdownMenuContent>
      </DropdownMenu>

      {isEditOpen && businessId && (
        <ShipperFormDialog
          businessId={businessId}
          shipper={shipper}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isDeleteOpen && businessId && (
        <DeleteShipperDialog
          businessId={businessId}
          shipperId={shipper.id}
          shipperName={shipper.name}
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
};

export { ShipperRowActions };
