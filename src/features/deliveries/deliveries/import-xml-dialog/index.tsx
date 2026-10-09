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

import { useQueryClient } from "react-query";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { revalidateTags } from "@/actions/revalidate";

import {
  importDeliveryXml,
  type ImportSummary,
  type ImportResultItem,
} from "@/actions/delivery/import-delivery-xml";

import { cn } from "@/lib/utils";
import { isStaleActionResult } from "@/lib/action-result";

import { FileDropzone } from "@/components/shared/custom/file-dropzone";
import {
  IGNORE_BLUR_ATTRIBUTE,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { useImportXmlFiles, MAX_FILES } from "./hooks";
import { ShipperSelector } from "../shipper-selector";
import {
  canCloseImportDialog,
  importRevalidationTags,
  importToastKind,
} from "../../lib/import-outcome";

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
    className: "text-yellow-700 dark:text-yellow-500",
  },
  invalid: {
    label: "Erro",
    icon: CircleAlert,
    className: "text-red-600 dark:text-red-400",
  },
};

const formatSize = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;

const ImportXmlDialog = ({
  businessId,
  isOpen,
  onClose,
}: ImportXmlDialogProps): JSX.Element => {
  const { files, isReading, rejection, addFiles, removeFile, clearFiles } =
    useImportXmlFiles();

  // Live validation (decision 16.700): Importar is enabled and says what is
  // missing (decision 16.701).
  const live = useLiveValidation({
    values: { files: files.length },
    rules: () => ({
      files: files.length > 0 ? null : "Escolha ao menos um XML de NF-e.",
    }),
    controlIds: { files: "import-xml-files" },
    resetKey: isOpen,
    validateOnSubmit: false,
  });

  const queryClient = useQueryClient();

  const [scheduledDate, setScheduledDate] = useState<string>("");

  // Optional (DLV-IMP-2): forces the shipper of every note. A note whose
  // issuer is missing or deactivated otherwise had no way in.
  const [shipperId, setShipperId] = useState<string>("");

  const [isImporting, setIsImporting] = useState<boolean>(false);

  const [summary, setSummary] = useState<ImportSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      clearFiles();
      setScheduledDate("");
      setShipperId("");
      setSummary(null);
    }
  }, [isOpen, clearFiles]);

  const resetAndClose = () => {
    clearFiles();
    setScheduledDate("");
    setShipperId("");
    setSummary(null);
    onClose();
  };

  const handleImport = async () => {
    if (!live.validate()) return;

    setIsImporting(true);

    try {
      const response = await importDeliveryXml(
        businessId,
        files.map(({ filename, content }) => ({ filename, content })),
        {
          scheduled_date: scheduledDate || undefined,
          shipperId: shipperId || undefined,
        },
      );

      if (isStaleActionResult(response)) return;

      if (response.success && response.data) {
        setSummary(response.data);

        // Nothing imported is not a success (every file was a duplicate or
        // an error): the report is there, the toast says so.
        toast[importToastKind(response.data.imported)](response.message);

        // Every upload is an Importações row now (decision 5.6), and the
        // issuers may have become shippers: all of it refreshes, not only
        // the deliveries table.
        const created = response.data.created_shippers.length;

        await revalidateTags(importRevalidationTags(created));

        if (created > 0) {
          void queryClient.invalidateQueries(["shipper", businessId]);
        }
      } else {
        toast.error(response.message);
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    // ESC and the X wait while the upload is in flight (UI-MODAL-11), as in
    // the spreadsheet dialog: closing lost the report being waited for.
    <Dialog
      open={isOpen}
      onOpenChange={(open) =>
        !open && canCloseImportDialog(isImporting) && resetAndClose()
      }
    >
      {/* max-w-xl like the shipper and occurrence-type dialogs (the
          reference the user named), with their full-width footer. */}
      <DialogScrollContent className="max-h-[90vh] max-w-xl">
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

        <div ref={live.ref} className="space-y-4 mt-2">
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
                id="import-xml-files"
                // What a pick left out is said at once; "missing" waits for
                // Importar like any field.
                error={rejection ?? live.messageOf("files")}
                onFiles={(picked) => {
                  live.touch("files");
                  void addFiles(picked);
                }}
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

              <ShipperSelector
                businessId={businessId}
                value={shipperId}
                onChange={setShipperId}
                label="Embarcador (opcional)"
                disabled={isImporting}
              />
              <p className="-mt-2 text-xs text-muted-foreground">
                Sem embarcador, o emitente de cada nota vira o embarcador.
                Escolha um quando a nota não traz o emitente.
              </p>

              <div className="w-full">
                {/* A day (decision 1.3): "YYYY-MM-DD", no time. */}
                <DatePickerField
                  label="Data prevista de entrega (opcional)"
                  htmlfor="import_scheduled_date"
                  name="import_scheduled_date"
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  disabled={isImporting}
                  allowFutureDates
                  dateOnly
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
                  <p className="text-2xl font-semibold text-yellow-700 dark:text-yellow-500">
                    {summary.duplicated}
                  </p>
                  <p className="text-xs text-muted-foreground">Já existiam</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
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

          <DialogFormFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={resetAndClose}
              {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
            >
              {summary ? "Fechar" : "Cancelar"}
            </Button>

            {!summary && (
              <Button
                type="button"
                onClick={() => void handleImport()}
                disabled={isImporting || isReading}
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
          </DialogFormFooter>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { ImportXmlDialog };
