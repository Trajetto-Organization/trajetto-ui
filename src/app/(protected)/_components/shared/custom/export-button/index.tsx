"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ExportButtonProps } from "./export-button.types";
import { Loader2, Download, FileSpreadsheet, FileText } from "lucide-react";

import { useAuthStore } from "@/store/auth-store";
import { useExportButton } from "./hooks";

const ExportButton = ({
  className,
  hasData = false,
  exportAction,
  entityName = "relatório",
  writePermission,
}: ExportButtonProps): JSX.Element => {
  const { role } = useAuthStore();
  const { handleExport, isExporting } = useExportButton({
    exportAction,
    entityName,
    writePermission,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={
            isExporting || !hasData || (!writePermission && role !== "MASTER")
          }
          className={`h-8 w-full gap-2 ${className}`}
          data-tutorial="export-button"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}

          {isExporting ? "Exportando..." : "Exportar"}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          className="cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ExportButton };
