"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  CircleAlert,
  CircleCheck,
  CircleSlash,
  FileText,
  FileUp,
  Loader,
  Trash2,
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

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { revalidateTagName } from "@/actions/revalidate";

import {
  importDeliveryXml,
  type ImportSummary,
  type ImportResultItem,
} from "@/actions/delivery/import-delivery-xml";

import { cn } from "@/lib/utils";

import { FileDropzone } from "@/components/shared/custom/file-dropzone";
import { useImportXmlFiles, MAX_FILES } from "./hooks";

interface ImportXmlDialogProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
}

const OUTCOME_META: Record<
  ImportResultItem["outcome"],
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

const ImportXmlDialog = ({
  businessId,
  isOpen,
  onClose,
}: ImportXmlDialogProps): JSX.Element => {
  const { files, isReading, addFiles, removeFile, clearFiles } =
    useImportXmlFiles();

  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const [summary, setSummary] = useState<ImportSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      clearFiles();

      setScheduledDate("");
      setSummary(null);
    }
  }, [isOpen, clearFiles]);

  const resetAndClose = () => {
    clearFiles();
    setScheduledDate("");

    setSummary(null);
    onClose();
  };

  const handleImport = async () => {
    setIsImporting(true);

    try {
      const response = await importDeliveryXml(
        businessId,
        files.map(({ filename, content }) => ({ filename, content })),
        { scheduled_date: scheduledDate || undefined },
      );

      if (response.success && response.data) {
        setSummary(response.data);
        toast.success(response.message);

        if (response.data.imported > 0) {
          await revalidateTagName("update-delivery");
        }
      } else {
        toast.error(response.message);
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogScrollContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Importar XML de NF-e
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Cada nota vira uma entrega com destinatário, endereço e itens já
            preenchidos. Notas já importadas são ignoradas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {!summary && (
            <>
              <FileDropzone
                accept=".xml,text/xml,application/xml"
                multiple
                label="Arraste os XMLs aqui ou clique para escolher"
                droppingLabel="Solte os arquivos aqui"
                hint={`Somente arquivos .xml de NF-e — até ${MAX_FILES} por importação, 512 KB cada`}
                isBusy={isReading}
                busyLabel="Lendo arquivos..."
                disabled={isImporting}
                onFiles={(picked) => void addFiles(picked)}
              />

              {files.length > 0 && (
                <div className="rounded-lg border">
                  <div className="flex items-center justify-between border-b px-4 py-2">
                    <p className="text-sm font-medium">
                      {files.length} de {MAX_FILES} arquivo(s) selecionado(s)
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      disabled={isImporting}
                      onClick={clearFiles}
                    >
                      Limpar tudo
                    </Button>
                  </div>

                  <ul className="max-h-52 overflow-y-auto divide-y">
                    {files.map((file) => (
                      <li
                        key={file.filename}
                        className="flex items-center gap-3 px-4 py-2"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{file.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSize(file.size)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label={`Remover ${file.filename}`}
                          disabled={isImporting}
                          onClick={() => removeFile(file.filename)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="w-full">
                <DatePickerField
                  label="Data prevista de entrega (opcional)"
                  htmlfor="import_scheduled_date"
                  name="import_scheduled_date"
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  disabled={isImporting}
                  allowFutureDates
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Aplicada a todas as entregas desta importação.
                </p>
              </div>
            </>
          )}

          {summary && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold text-green-600">
                    {summary.imported}
                  </p>
                  <p className="text-xs text-muted-foreground">Importadas</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold text-yellow-600">
                    {summary.duplicated}
                  </p>
                  <p className="text-xs text-muted-foreground">Já existiam</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold text-red-600">
                    {summary.invalid}
                  </p>
                  <p className="text-xs text-muted-foreground">Com erro</p>
                </div>
              </div>

              {summary.created_shippers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Embarcadores criados a partir do emitente das notas:{" "}
                  {summary.created_shippers.join(", ")}.
                </p>
              )}

              <Separator />

              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {summary.results.map((result) => {
                  const meta = OUTCOME_META[result.outcome];
                  const Icon = meta.icon;

                  return (
                    <li
                      key={result.filename}
                      className="flex items-start gap-2 rounded-md border p-2 text-xs"
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 shrink-0",
                          meta.className,
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {result.filename}
                        </p>
                        <p className="text-muted-foreground">
                          {meta.label}
                          {result.recipient_name
                            ? ` — ${result.recipient_name}`
                            : ""}
                        </p>
                        {result.message && (
                          <p className="text-muted-foreground">
                            {result.message}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              {summary ? "Fechar" : "Cancelar"}
            </Button>

            {!summary && (
              <Button
                type="button"
                onClick={() => void handleImport()}
                disabled={isImporting || isReading || files.length === 0}
              >
                <span>
                  Importar
                  {files.length > 0 ? ` ${files.length} arquivo(s)` : ""}
                </span>
                {isImporting && (
                  <div className="ml-2 animate-spin">
                    <Loader className="h-4 w-4" />
                  </div>
                )}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { ImportXmlDialog };
