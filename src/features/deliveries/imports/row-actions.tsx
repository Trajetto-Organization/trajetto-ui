"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";

import { MoreHorizontal, Undo2 } from "lucide-react";
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

import type { ImportData } from "@/actions/import/list-imports";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";

import { ImportReportDialog } from "./report-dialog";
import { ReverseImportDialog } from "./reverse-dialog";

import { canReverse } from "./lib/status";

interface ImportRowActionsProps {
  row: Row<ImportData>;
}

const ImportRowActions = ({ row }: ImportRowActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();
  const record = row.original;

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isReverseOpen, setIsReverseOpen] = useState<boolean>(false);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const handleCopyID = () => {
    navigator.clipboard
      .writeText(record.id)
      .then(() => toast.success("ID copiado para a área de transferência!"))
      .catch((error) => toast.error("Erro ao copiar o ID: " + error));
  };

  /**
   * Why the undo is refused, in the words the operator needs.
   *
   * An empty string means it is offered. A disabled button with no
   * explanation is the thing this app never does.
   */
  const reverseBlockedReason = !permissionsRequired.hasAllPermissions
    ? permissionsRequired.tooltipMessage
    : record.status === "REVERSED"
      ? "Esta importação já foi estornada."
      : record.status === "IN_PROGRESS"
        ? "A importação ainda está em andamento. Aguarde o fim para estorná-la."
        : "";

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

        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuItem
            className="cursor-pointer truncate block"
            onClick={() => {
              setIsDropdownOpen(false);
              setIsReportOpen(true);
            }}
          >
            Ver relatório
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer truncate block"
            onClick={handleCopyID}
          >
            Copiar ID
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center
                    justify-between"
                    disabled={
                      !canReverse(record) ||
                      !permissionsRequired.hasAllPermissions
                    }
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsReverseOpen(true);
                    }}
                  >
                    Estornar
                    <Undo2
                      size={17}
                      className="dark:text-red-500 text-red-600"
                    />
                  </DropdownMenuItem>
                </div>
              </TooltipTrigger>

              {reverseBlockedReason && (
                <TooltipContent className="max-w-sm">
                  <p>{reverseBlockedReason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DropdownMenuContent>
      </DropdownMenu>

      {isReportOpen && (
        <ImportReportDialog
          record={record}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {isReverseOpen && businessId && (
        <ReverseImportDialog
          businessId={businessId}
          importId={record.id}
          filename={record.filename}
          imported={record.imported}
          isOpen={isReverseOpen}
          onClose={() => setIsReverseOpen(false)}
        />
      )}
    </>
  );
};

export { ImportRowActions };
