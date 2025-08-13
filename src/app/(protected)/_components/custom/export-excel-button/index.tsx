"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

import { toast } from "sonner";

interface ExportExcelButtonProps {
  className?: string;
  hasData?: boolean;
  exportAction: (search?: string) => Promise<{
    success?: boolean;
    message?: string;
    base64Data?: string;
    filename?: string;
    totalRecords?: number;
  }>;
  entityName?: string;
  buttonText?: string;
}

const ExportExcelButton = ({ 
  className, 
  hasData = false, 
  exportAction,
  entityName = "relatório",
  buttonText = "Exportar (Excel)"
}: ExportExcelButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const searchParams = useSearchParams();

  async function handleExportExcel() {
    setIsExporting(true);

    try {
      const search = searchParams.get("search") || "";
      const result = await exportAction(search);

      if (!result.success || !result.base64Data) {
        toast.error(
          result.message || `Erro ao exportar ${entityName}. Tente novamente.`,
        );
        return;
      }

      // Convert base64 to Blob
      const byteCharacters = atob(result.base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Create temporary URL and download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.style.display = "none";
      a.href = url;

      a.download =
        result.filename ||
        `${entityName}-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);

      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(result.message || `${entityName} exportado com sucesso!`);
    } catch (error) {
      toast.error(`Erro ao exportar ${entityName}. Tente novamente.`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportExcel}
      disabled={isExporting || !hasData}
      className={`h-8 gap-1 ${className}`}
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