"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ExportButtonProps } from "./export-button.types";
import { Loader2, Download, FileSpreadsheet, FileText } from "lucide-react";

import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";

import { useExportButton } from "./hooks";
import { exportBlocker } from "./export-rules";

const ExportButton = ({
  className,
  hasData = false,
  exportRequest,
  entityName = "relatório",
  writePermission,
}: ExportButtonProps): JSX.Element => {
  const { role } = useAuthStore();

  // h-9 on /admin and /dashboard alike (decision 16.61).
  const actionClassName = usePageActionClassName();

  const isMaster = role === "MASTER";

  const blocker = exportBlocker({ writePermission, isMaster, hasData });

  const { handleExport, isExporting } = useExportButton({
    exportRequest,
    entityName,
    // The handler refuses on the same rule the button is disabled by.
    writePermission: Boolean(writePermission) || isMaster,
  });

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* A disabled button fires no pointer events: the wrapper is what
              the tooltip anchors to, so the reason still shows on hover. */}
          <div className="w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting || blocker !== null}
                  className={cn(actionClassName, "gap-2", className)}
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
          </div>
        </TooltipTrigger>

        {blocker && !isExporting && (
          <TooltipContent className="max-w-sm">
            <p>{blocker}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export { ExportButton };
