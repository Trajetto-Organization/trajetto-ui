"use client";

import { Button } from "@/components/ui/button";
import { useExportExcelButton } from "./hooks";

import { FileSpreadsheet, Loader2 } from "lucide-react";
import { ExportExcelButtonProps } from "./dto";

const ExportExcelButton = ({
  className,
  hasData = false,
  exportAction,
  entityName = "relatório",
  buttonText = "Exportar (Excel)",
}: ExportExcelButtonProps) => {
  const { handleExportExcel, isExporting } = useExportExcelButton({
    exportAction,
    entityName,
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportExcel}
      disabled={isExporting || !hasData}
      className={`h-8 w-full gap-1 ${className}`}
      data-tutorial="export-excel"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      {isExporting ? "Exportando..." : buttonText}
    </Button>
  );
};

export { ExportExcelButton };
