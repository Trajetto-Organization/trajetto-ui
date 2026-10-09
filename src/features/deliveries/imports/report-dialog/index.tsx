"use client";

import { useEffect, useState } from "react";

import {
  CircleAlert,
  CircleCheck,
  CircleSlash,
  Loader2,
  Route as RouteIcon,
  TriangleAlert,
} from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ImportData } from "@/actions/import/list-imports";
import type {
  ImportReport,
  ImportRowResult,
} from "@/actions/import/import-spreadsheet";

import { getImport } from "@/actions/import/get-import";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";

interface ImportReportDialogProps {
  record: ImportData;
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
    className: "text-yellow-700 dark:text-yellow-500",
  },
  invalid: {
    label: "Erro",
    icon: CircleAlert,
    className: "text-red-600 dark:text-red-400",
  },
};

/**
 * The report, hours after the upload.
 *
 * This is the reason the report is stored rather than only returned: "qual das
 * duzentas falhou?" is asked by somebody who did not do the upload and cannot
 * re-run it to find out. Failures come first, because scrolling past a hundred
 * successes to find three is hunting, not reading.
 */
const ImportReportDialog = ({
  record,
  isOpen,
  onClose,
}: ImportReportDialogProps): JSX.Element => {
  /**
   * The report is read when the dialog opens, not carried by the listing: it
   * is one entry per spreadsheet line. An API from before that change still
   * puts it on the row, and then there is nothing to fetch.
   */
  const [fetched, setFetched] = useState<ImportReport | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || record.report) return;

    let cancelled = false;

    setFailure(null);

    getImport(record.id, record.businessId)
      .then((result) => {
        if (cancelled) return;

        if (isStaleActionResult(result, { background: true })) {
          setFailure(STALE_ACTION_MESSAGE);
        } else if (result.success && result.data) {
          setFetched(result.data.report);
        } else {
          setFailure(result.message);
        }
      })
      .catch(() => {
        // The action answers its own failures; this is the call to it not
        // reaching the server at all.
        if (!cancelled) {
          setFailure("Não foi possível carregar o relatório desta importação.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, record.id, record.businessId, record.report]);

  const report = record.report ?? fetched;

  // Nothing to show yet and nothing went wrong: the read is on its way. Kept
  // apart from "no rows", which is a real answer about an upload.
  const loading = !report && !failure;

  const rows = [...(report?.rows ?? [])].sort((left, right) => {
    const weight = { invalid: 0, duplicated: 1, imported: 2 } as const;

    return (
      weight[left.outcome] - weight[right.outcome] || left.line - right.line
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogScrollContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate">{record.filename}</DialogTitle>
          <DialogDescription>
            Resultado linha a linha, com o número que cada uma tem na planilha
            do operador — o cabeçalho é a linha 1.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["imported", record.imported],
                ["duplicated", record.duplicated],
                ["invalid", record.invalid],
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
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                </div>
              );
            })}
          </div>

          {report && report.routes.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <RouteIcon className="h-4 w-4 shrink-0" />
                Rotas criadas ({report.routes.length})
              </p>

              <ul className="space-y-1 text-sm text-muted-foreground">
                {report.routes.map((route) => (
                  <li key={route.id}>
                    #{route.code}
                    {route.name ? ` — ${route.name}` : ""} ({route.stops} parada
                    {route.stops === 1 ? "" : "s"})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report && report.unknownHeaders.length > 0 && (
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
                  {report.unknownHeaders.join(", ")}.
                </span>
              </p>
            </div>
          )}

          {loading ? (
            <p
              className="flex items-center justify-center gap-2 py-6 text-sm
              text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando o relatório…
            </p>
          ) : failure && !report ? (
            <p className="py-6 text-center text-sm text-destructive">
              {failure}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Esta importação não registrou linhas.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto">
              {rows.map((row) => {
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
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { ImportReportDialog };
