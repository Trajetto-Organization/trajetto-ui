"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  CircleAlert,
  CircleCheck,
  CircleSlash,
  Download,
  FileSpreadsheet,
  Loader,
  Route as RouteIcon,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { revalidateTagName } from "@/actions/revalidate";

import {
  importSpreadsheet,
  type ImportRowResult,
  type ImportSpreadsheetResult,
} from "@/actions/import/import-spreadsheet";

import { downloadImportTemplate } from "@/actions/import/download-template";

import { FileDropzone } from "@/components/shared/custom/file-dropzone";

import { ShipperSelector } from "../shipper-selector";
import { useImportSpreadsheet } from "./hooks";

import { cn } from "@/lib/utils";

interface ImportSpreadsheetDialogProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
}

const OUTCOME_META: Record<
  ImportRowResult["outcome"],
  { label: string; icon: typeof CircleCheck; className: string }
> = {
  imported: {
    label: "Importada",
    icon: CircleCheck,
    className: "text-green-600",
  },
  duplicated: {
    label: "Já existia",
    icon: CircleSlash,
    className: "text-yellow-600",
  },
  invalid: { label: "Erro", icon: CircleAlert, className: "text-red-600" },
};

const formatSize = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;

/**
 * Loading a morning's work from the spreadsheet a dispatcher already has.
 *
 * The model is downloaded from the API rather than shipped here, because the
 * API generates it from the same column list its parser reads — a model that
 * drifted from the importer is worse than no model, since people trust it.
 *
 * The report is the point of the screen, not a courtesy. "Qual das duzentas
 * falhou?" is asked by somebody who did not do the upload, hours later, and a
 * summary of three numbers cannot answer it. So every line comes back with
 * the number it has in the operator's own spreadsheet — header is line 1 —
 * and the failures are listed first.
 */
const ImportSpreadsheetDialog = ({
  businessId,
  isOpen,
  onClose,
}: ImportSpreadsheetDialogProps): JSX.Element => {
  const { file, isReading, pickFile, clearFile } = useImportSpreadsheet();

  const [shipperId, setShipperId] = useState<string>("");

  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const [result, setResult] = useState<ImportSpreadsheetResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      clearFile();

      setShipperId("");
      setResult(null);
    }
  }, [isOpen, clearFile]);

  const resetAndClose = () => {
    clearFile();

    setShipperId("");
    setResult(null);

    onClose();
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);

    try {
      const response = await downloadImportTemplate();

      if (!response.success || !response.base64Data) {
        toast.error(response.message ?? "Não foi possível baixar o modelo.");
        return;
      }

      const bytes = Uint8Array.from(atob(response.base64Data), (character) =>
        character.charCodeAt(0),
      );

      const url = URL.createObjectURL(
        new Blob([bytes], { type: response.mimeType }),
      );

      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = response.filename ?? "modelo-importacao.xlsx";

      document.body.appendChild(anchor);
      anchor.click();

      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !shipperId) return;

    setIsImporting(true);

    try {
      const response = await importSpreadsheet(
        businessId,
        { filename: file.filename, content: file.content },
        shipperId,
      );

      if (response.success && response.data) {
        setResult(response.data);

        if (response.data.imported > 0) {
          toast.success(response.message);
          await revalidateTagName("update-delivery");
        } else {
          // Nothing was created. Saying "sucesso" over that is how a screen
          // teaches people to stop reading its messages.
          toast.warning(response.message);
        }

        return;
      }

      toast.error(response.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Failures first: the lines that need a human are the reason this list
  // exists, and scrolling past a hundred successes to find three is not
  // reading, it is hunting.
  const reportRows = [...(result?.report.rows ?? [])].sort((left, right) => {
    const weight = { invalid: 0, duplicated: 1, imported: 2 } as const;

    return weight[left.outcome] - weight[right.outcome] || left.line - right.line;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogScrollContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 shrink-0" />
            Importar planilha
          </DialogTitle>

          <DialogDescription>
            Uma linha, uma entrega. Preencher as colunas de rota cria a rota e
            põe as linhas nela, na ordem da planilha.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["imported", result.imported],
                  ["duplicated", result.duplicated],
                  ["invalid", result.invalid],
                ] as const
              ).map(([outcome, count]) => {
                const meta = OUTCOME_META[outcome];
                const Icon = meta.icon;

                return (
                  <div
                    key={outcome}
                    className="rounded-lg border p-3 text-center"
                  >
                    <Icon className={cn("mx-auto h-5 w-5", meta.className)} />
                    <p className="mt-1 text-2xl font-semibold">{count}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {result.report.routes.length > 0 && (
              <div className="rounded-lg border p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <RouteIcon className="h-4 w-4 shrink-0" />
                  Rotas criadas ({result.report.routes.length})
                </p>

                <ul className="space-y-1 text-sm text-muted-foreground">
                  {result.report.routes.map((route) => (
                    <li key={route.id}>
                      #{route.code}
                      {route.name ? ` — ${route.name}` : ""} ({route.stops}{" "}
                      parada{route.stops === 1 ? "" : "s"})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.report.unknownHeaders.length > 0 && (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 p-3
                dark:border-amber-900 dark:bg-amber-950/30"
              >
                <p
                  className="flex items-start gap-2 text-sm
                  text-amber-900 dark:text-amber-200"
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>Colunas não reconhecidas:</strong>{" "}
                    {result.report.unknownHeaders.join(", ")}. Elas foram
                    ignoradas — se alguma delas era para ser importada, confira
                    o cabeçalho no modelo.
                  </span>
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium">
                Resultado por linha ({reportRows.length})
              </p>

              <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                {reportRows.map((row) => {
                  const meta = OUTCOME_META[row.outcome];
                  const Icon = meta.icon;

                  return (
                    <li
                      key={`${row.line}-${row.outcome}-${row.reference ?? ""}`}
                      className="flex items-start gap-2 rounded-md border p-2
                      text-sm"
                    >
                      <Icon
                        className={cn("mt-0.5 h-4 w-4 shrink-0", meta.className)}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          Linha {row.line}
                          {row.recipient_name ? ` — ${row.recipient_name}` : ""}
                        </p>

                        {row.message && (
                          <p className="text-xs text-muted-foreground">
                            {row.message}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <DialogFooter>
              <Button type="button" onClick={resetAndClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDownloadTemplate()}
              disabled={isDownloading}
              className="w-full gap-2"
            >
              {isDownloading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Baixar modelo da planilha
            </Button>

            <ShipperSelector
              businessId={businessId}
              value={shipperId}
              onChange={setShipperId}
            />

            <p className="-mt-2 text-xs text-muted-foreground">
              Uma importação é a carga de um embarcador. Uma planilha que
              mistura embarcadores são duas importações.
            </p>

            <Separator />

            <FileDropzone
              accept=".xlsx,.csv"
              label="Arraste a planilha aqui ou clique para escolher"
              droppingLabel="Solte a planilha aqui"
              hint=".xlsx ou .csv, até 6 MB"
              isBusy={isReading}
              busyLabel="Lendo o arquivo..."
              disabled={isImporting}
              onFiles={(files) => void pickFile(files)}
            />

            {file && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {file.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  aria-label="Remover arquivo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetAndClose}
                disabled={isImporting}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={() => void handleImport()}
                disabled={!file || !shipperId || isImporting || isReading}
                className="gap-2"
              >
                {isImporting && <Loader className="h-4 w-4 animate-spin" />}
                Importar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { ImportSpreadsheetDialog, OUTCOME_META };
